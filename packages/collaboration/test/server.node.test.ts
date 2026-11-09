import {
  createState,
  stepToJSON,
  toJSON,
  type DocJSON,
  type EditorState,
  type Transaction,
} from '@numior/editor-core';
import { fixtureSchema } from '@numior/editor-core/fixtures';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { editorAuthority } from '../server/authority';
import { createRoom, type RoomPeer } from '../server/room';
import { startCollabServer, type CollabServer } from '../server/server';
import {
  ClientMessageKind,
  CollabStatusKind,
  RejectReason,
  ServerErrorCode,
  ServerMessageKind,
  collab,
  createCollabClient,
  editorCollabDocument,
  webSocketTransport,
  type CollabClient,
  type ServerMessage,
  type WireStep,
} from '../src';
import { paragraphs } from './harness/network';

interface Peer extends RoomPeer {
  readonly inbox: ServerMessage[];
}

interface LiveEditor {
  readonly client: CollabClient;
  readonly doc: () => DocJSON;
  readonly type: (text: string, at: number) => void;
}

const SCHEMA = { name: fixtureSchema.name, version: fixtureSchema.version };

const peerOf = (clientId: string): Peer => {
  const inbox: ServerMessage[] = [];

  return {
    clientId,
    inbox,
    send: (message) => {
      inbox.push(message);
    },
  };
};

const insertionAt = (text: string, at: number): WireStep[] => {
  const state = createState({ doc: paragraphs('one') });

  return state.tr.insertText(text, at).steps.map(stepToJSON);
};

const joined = (...peers: readonly Peer[]): ReturnType<typeof createRoom> => {
  const room = createRoom(editorAuthority(paragraphs('one')));

  for (const peer of peers) {
    room.join(peer, {
      kind: ClientMessageKind.Hello,
      doc: 'doc',
      clientId: peer.clientId,
      version: 0,
      schema: SCHEMA,
    });

    peer.inbox.length = 0;
  }
  return room;
};

const liveEditor = (server: CollabServer, name: string): LiveEditor => {
  const initial = paragraphs('one');
  let state: EditorState | undefined;

  const apply = (tr: Transaction): void => {
    state = state?.apply(tr);
  };

  const client = createCollabClient({
    doc: 'live',
    clientId: name,
    schema: SCHEMA,
    transport: webSocketTransport(`ws://localhost:${server.port().toString()}`),
    document: editorCollabDocument({
      schema: fixtureSchema,
      getState: () => state,
      dispatch: apply,
      load: (doc, version) => {
        state = createState({ doc, plugins: [collab({ version })] });
      },
    }),
  });

  return {
    client,
    doc: () => (state === undefined ? toJSON(initial) : toJSON(state.doc)),
    type: (text, at) => {
      if (state !== undefined) {
        apply(state.tr.insertText(text, at));
        client.sync();
      }
    },
  };
};

let running: CollabServer | undefined;

const live: LiveEditor[] = [];

afterEach(async () => {
  for (const editor of live.splice(0)) {
    editor.client.stop();
  }

  await running?.close();
  running = undefined;
});

describe('reference room', () => {
  it('sends a snapshot only to a client without a document', () => {
    const fresh = peerOf('fresh');
    const known = peerOf('known');
    const room = createRoom(editorAuthority(paragraphs('one')));

    room.join(fresh, {
      kind: ClientMessageKind.Hello,
      doc: 'doc',
      clientId: 'fresh',
      version: null,
      schema: SCHEMA,
    });

    room.join(known, {
      kind: ClientMessageKind.Hello,
      doc: 'doc',
      clientId: 'known',
      version: 0,
      schema: SCHEMA,
    });

    expect(fresh.inbox[0]).toEqual({
      kind: ServerMessageKind.Welcome,
      version: 0,
      snapshot: toJSON(paragraphs('one')),
    });

    expect(known.inbox[0]).toEqual({ kind: ServerMessageKind.Welcome, version: 0 });
  });

  it('refuses another schema version', () => {
    const peer = peerOf('old');
    const room = createRoom(editorAuthority(paragraphs('one')));

    const accepted = room.join(peer, {
      kind: ClientMessageKind.Hello,
      doc: 'doc',
      clientId: 'old',
      version: 0,
      schema: { name: SCHEMA.name, version: SCHEMA.version + 1 },
    });

    expect(accepted).toBe(false);
    expect(peer.inbox).toEqual([{ kind: ServerMessageKind.Error, code: ServerErrorCode.Schema }]);
  });

  it('acknowledges the author and broadcasts to the others', () => {
    const author = peerOf('author');
    const reader = peerOf('reader');
    const room = joined(author, reader);
    const steps = insertionAt('x', 1);

    room.receive(author, { kind: ClientMessageKind.Steps, seq: 1, version: 0, steps });

    expect(author.inbox).toEqual([{ kind: ServerMessageKind.Accepted, seq: 1, version: 1 }]);

    expect(reader.inbox).toEqual([
      { kind: ServerMessageKind.Steps, version: 0, clientId: 'author', steps },
    ]);
  });

  it('rejects steps on an old version', () => {
    const first = peerOf('first');
    const second = peerOf('second');
    const room = joined(first, second);
    const steps = insertionAt('x', 1);

    room.receive(first, { kind: ClientMessageKind.Steps, seq: 1, version: 0, steps });
    room.receive(second, { kind: ClientMessageKind.Steps, seq: 1, version: 0, steps });

    expect(second.inbox.at(-1)).toEqual({
      kind: ServerMessageKind.Rejected,
      seq: 1,
      reason: RejectReason.Stale,
      version: 1,
    });
  });

  it.each([
    ['an unreadable step', [{ kind: 'nope' }]],
    ['a position past the end', insertionAt('x', 1).map((step) => ({ ...step, from: 99, to: 99 }))],
  ])('rejects %s and keeps the log', (_name, steps) => {
    const peer = peerOf('bad');
    const room = joined(peer);

    room.receive(peer, { kind: ClientMessageKind.Steps, seq: 1, version: 0, steps });

    expect(peer.inbox).toEqual([
      { kind: ServerMessageKind.Rejected, seq: 1, reason: RejectReason.Invalid, version: 0 },
    ]);
  });

  it('groups a pull by author', () => {
    const first = peerOf('first');
    const second = peerOf('second');
    const room = joined(first, second);
    const steps = insertionAt('x', 1);

    room.receive(first, { kind: ClientMessageKind.Steps, seq: 1, version: 0, steps });
    room.receive(first, { kind: ClientMessageKind.Steps, seq: 2, version: 1, steps });
    room.receive(second, { kind: ClientMessageKind.Steps, seq: 1, version: 2, steps });
    second.inbox.length = 0;

    room.receive(second, { kind: ClientMessageKind.Pull, from: 1 });

    expect(second.inbox).toEqual([
      { kind: ServerMessageKind.Steps, version: 1, clientId: 'first', steps },
      { kind: ServerMessageKind.Steps, version: 2, clientId: 'second', steps },
    ]);
  });

  it('answers a pull from the future and a repeated hello with an error', () => {
    const peer = peerOf('odd');
    const room = joined(peer);

    room.receive(peer, { kind: ClientMessageKind.Pull, from: 9 });

    room.receive(peer, {
      kind: ClientMessageKind.Hello,
      doc: 'doc',
      clientId: 'odd',
      version: 0,
      schema: SCHEMA,
    });

    expect(peer.inbox).toEqual([
      { kind: ServerMessageKind.Error, code: ServerErrorCode.Protocol },
      { kind: ServerMessageKind.Error, code: ServerErrorCode.Protocol },
    ]);
  });

  it('stops broadcasting to a peer that left', () => {
    const author = peerOf('author');
    const gone = peerOf('gone');
    const room = joined(author, gone);

    room.leave(gone);

    room.receive(author, {
      kind: ClientMessageKind.Steps,
      seq: 1,
      version: 0,
      steps: insertionAt('x', 1),
    });

    expect(gone.inbox).toHaveLength(0);
  });
});

describe('reference server over WebSocket', () => {
  it('brings two editors to one document', async () => {
    running = await startCollabServer({
      port: 0,
      authorityFor: () => editorAuthority(paragraphs('one')),
    });

    const first = liveEditor(running, 'first');
    const second = liveEditor(running, 'second');

    live.push(first, second);

    await vi.waitFor(() => {
      expect(first.client.status().kind).toBe(CollabStatusKind.Online);
      expect(second.client.status().kind).toBe(CollabStatusKind.Online);
    });

    first.type('A', 1);
    second.type('B', 4);

    await vi.waitFor(() => {
      expect(first.doc()).toEqual(second.doc());
      expect(JSON.stringify(first.doc())).toContain('Aone');
      expect(JSON.stringify(first.doc())).toContain('oneB');
    });
  });

  it('answers garbage with a protocol error', async () => {
    running = await startCollabServer({
      port: 0,
      authorityFor: () => editorAuthority(paragraphs('one')),
    });

    const socket = new WebSocket(`ws://localhost:${running.port().toString()}`);
    const answers: unknown[] = [];

    socket.addEventListener('message', (event) => {
      answers.push(event.data);
    });

    socket.addEventListener('open', () => {
      socket.send('not json');
    });

    await vi.waitFor(() => {
      expect(answers).toEqual([
        JSON.stringify({ kind: ServerMessageKind.Error, code: ServerErrorCode.Protocol }),
      ]);
    });

    socket.close();
  });
});
