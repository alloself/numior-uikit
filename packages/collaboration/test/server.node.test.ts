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
import { WebSocket as NodeSocket } from 'ws';
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

const hello = (doc: string, clientId = doc): string =>
  JSON.stringify({ kind: ClientMessageKind.Hello, doc, clientId, version: 0, schema: SCHEMA });

const HEARTBEAT = 150;

const PATIENCE = { timeout: 5000 };

const GONE = JSON.stringify({ kind: ServerMessageKind.Presence, clientId: 'silent', state: null });

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

const linkedText = (attrs: Readonly<Record<string, unknown>>): WireStep[] => [
  {
    kind: 'replace',
    from: 1,
    to: 1,
    slice: { content: [{ text: 'x', marks: [{ type: 'link', attrs }] }], openStart: 0, openEnd: 0 },
  },
];

const BOLD_ALL = { kind: 'addMark', from: 1, to: 4, mark: { type: 'bold' } } as const;

const removalOf = (from: number, to: number): WireStep[] => {
  const state = createState({ doc: paragraphs('one') });

  return state.tr.delete(from, to).steps.map(stepToJSON);
};

const joined = (...peers: readonly Peer[]): ReturnType<typeof createRoom> => {
  const room = createRoom(editorAuthority(paragraphs('one'), { window: 2 }));

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
      if (state === undefined) {
        return;
      }

      apply(state.tr.insertText(text, at));
      client.sync();
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
      presence: [],
      snapshot: toJSON(paragraphs('one')),
    });

    expect(known.inbox[0]).toEqual({ kind: ServerMessageKind.Welcome, version: 0, presence: [] });
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

  it('moves steps written on an old version over the missed ones and tells both sides', () => {
    const first = peerOf('first');
    const second = peerOf('second');
    const room = joined(first, second);
    const moved = insertionAt('y', 4).map((step) => ({ ...step, from: 5, to: 5 }));

    room.receive(first, {
      kind: ClientMessageKind.Steps,
      seq: 1,
      version: 0,
      steps: insertionAt('x', 1),
    });

    room.receive(second, {
      kind: ClientMessageKind.Steps,
      seq: 1,
      version: 0,
      steps: insertionAt('y', 4),
    });

    expect(second.inbox.at(-1)).toEqual({
      kind: ServerMessageKind.Accepted,
      seq: 1,
      version: 2,
      steps: moved,
    });

    expect(first.inbox.at(-1)).toEqual({
      kind: ServerMessageKind.Steps,
      version: 1,
      clientId: 'second',
      steps: moved,
    });
  });

  it('acknowledges old steps that no longer change anything and tells nobody', () => {
    const first = peerOf('first');
    const second = peerOf('second');
    const room = joined(first, second);
    const steps = removalOf(1, 2);

    room.receive(first, { kind: ClientMessageKind.Steps, seq: 1, version: 0, steps });
    room.receive(second, { kind: ClientMessageKind.Steps, seq: 1, version: 0, steps });

    expect(second.inbox.at(-1)).toEqual({
      kind: ServerMessageKind.Accepted,
      seq: 1,
      version: 1,
      steps: [],
    });

    expect(first.inbox).toEqual([{ kind: ServerMessageKind.Accepted, seq: 1, version: 1 }]);
  });

  it('rejects old steps it can no longer trace back to their version', () => {
    const first = peerOf('first');
    const second = peerOf('second');
    const room = joined(first, second);
    const steps = insertionAt('x', 1);

    room.receive(first, { kind: ClientMessageKind.Steps, seq: 1, version: 0, steps });
    room.receive(first, { kind: ClientMessageKind.Steps, seq: 2, version: 1, steps });
    room.receive(first, { kind: ClientMessageKind.Steps, seq: 3, version: 2, steps });
    room.receive(second, { kind: ClientMessageKind.Steps, seq: 1, version: 0, steps });

    expect(second.inbox.at(-1)).toEqual({
      kind: ServerMessageKind.Rejected,
      seq: 1,
      reason: RejectReason.Stale,
      version: 3,
    });
  });

  it.each([
    [
      'never fitted their own version',
      0,
      insertionAt('x', 1).map((step) => ({ ...step, from: 99, to: 99 })),
    ],
    ['claim a version from the future', 5, insertionAt('x', 1)],
  ])('rejects old steps that %s', (_name, version, steps) => {
    const first = peerOf('first');
    const second = peerOf('second');
    const room = joined(first, second);

    room.receive(first, {
      kind: ClientMessageKind.Steps,
      seq: 1,
      version: 0,
      steps: insertionAt('x', 1),
    });

    room.receive(second, { kind: ClientMessageKind.Steps, seq: 1, version, steps });

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
    ['typed text with a link the schema refuses', linkedText({ href: 7 })],
    [
      'typed text with a link attribute the schema does not know',
      linkedText({ href: 'a', on: 'b' }),
    ],
    ['a mark with gaps that run backwards', [{ ...BOLD_ALL, skip: [{ from: 3, to: 2 }] }]],
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
      { kind: ServerMessageKind.Steps, version: 1, clientId: 'first', steps, sent: 1 },
      { kind: ServerMessageKind.Steps, version: 2, clientId: 'second', steps, sent: 1 },
    ]);
  });

  it('joins the batches of one author in a pull and counts what the author sent', () => {
    const first = peerOf('first');
    const room = joined(first);
    const steps = insertionAt('x', 1);

    room.receive(first, { kind: ClientMessageKind.Steps, seq: 1, version: 0, steps });

    room.receive(first, {
      kind: ClientMessageKind.Steps,
      seq: 2,
      version: 1,
      steps: [...steps, ...steps],
    });

    first.inbox.length = 0;

    room.receive(first, { kind: ClientMessageKind.Pull, from: 0 });
    room.receive(first, { kind: ClientMessageKind.Pull, from: 2 });

    expect(first.inbox).toEqual([
      {
        kind: ServerMessageKind.Steps,
        version: 0,
        clientId: 'first',
        steps: [...steps, ...steps, ...steps],
        sent: 3,
      },
      { kind: ServerMessageKind.Steps, version: 2, clientId: 'first', steps },
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

  it('relays presence and lists it for a newcomer', () => {
    const ann = peerOf('ann');
    const bob = peerOf('bob');
    const room = joined(ann, bob);
    const late = peerOf('late');

    room.receive(ann, { kind: ClientMessageKind.Presence, state: 'here' });

    room.join(late, {
      kind: ClientMessageKind.Hello,
      doc: 'doc',
      clientId: 'late',
      version: 0,
      schema: SCHEMA,
    });

    expect(ann.inbox).toEqual([]);

    expect(bob.inbox).toEqual([
      { kind: ServerMessageKind.Presence, clientId: 'ann', state: 'here' },
    ]);

    expect(late.inbox[0]).toMatchObject({ presence: [{ clientId: 'ann', state: 'here' }] });
  });

  it('clears presence when it is withdrawn and when a peer leaves', () => {
    const ann = peerOf('ann');
    const bob = peerOf('bob');
    const room = joined(ann, bob);

    room.receive(ann, { kind: ClientMessageKind.Presence, state: 'here' });
    room.receive(ann, { kind: ClientMessageKind.Presence, state: null });
    room.receive(ann, { kind: ClientMessageKind.Presence, state: 'back' });
    room.leave(ann);

    expect(bob.inbox.at(-2)).toMatchObject({ clientId: 'ann', state: 'back' });
    expect(bob.inbox.at(-1)).toMatchObject({ clientId: 'ann', state: null });
  });

  it('keeps presence when an old socket of a reconnected client closes', () => {
    const old = peerOf('ann');
    const bob = peerOf('bob');
    const room = joined(old, bob);
    const fresh = peerOf('ann');

    room.receive(old, { kind: ClientMessageKind.Presence, state: 'here' });

    room.join(fresh, {
      kind: ClientMessageKind.Hello,
      doc: 'doc',
      clientId: 'ann',
      version: 0,
      schema: SCHEMA,
    });

    bob.inbox.length = 0;

    room.leave(old);

    expect(bob.inbox).toEqual([]);
  });

  it('answers a ping of a client that hears nothing else', () => {
    const ann = peerOf('ann');
    const bob = peerOf('bob');
    const room = joined(ann, bob);

    room.receive(ann, { kind: ClientMessageKind.Ping });

    expect(ann.inbox).toEqual([{ kind: ServerMessageKind.Pong }]);
    expect(bob.inbox).toEqual([]);
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

  it('closes the socket of a room that fails to open and keeps serving the others', async () => {
    const failures: unknown[] = [];

    running = await startCollabServer({
      port: 0,
      authorityFor: (doc) => {
        if (doc === 'broken') {
          throw new TypeError('no authority');
        }
        return editorAuthority(paragraphs('one'));
      },
      onError: (error) => {
        failures.push(error);
      },
    });

    const address = `ws://localhost:${running.port().toString()}`;

    const broken = new WebSocket(address);
    const closes: number[] = [];

    broken.addEventListener('close', (event) => {
      closes.push(event.code);
    });

    broken.addEventListener('open', () => {
      broken.send(hello('broken'));
    });

    await vi.waitFor(() => {
      expect(closes).toEqual([1011]);
    });

    const healthy = new WebSocket(address);
    const answers: string[] = [];

    healthy.addEventListener('message', (event) => {
      answers.push(String(event.data));
    });

    healthy.addEventListener('open', () => {
      healthy.send(hello('healthy'));
    });

    await vi.waitFor(() => {
      expect(answers[0]).toContain(ServerMessageKind.Welcome);
    });

    expect(failures).toHaveLength(1);

    healthy.close();
  });

  it('drops a client that stopped answering and withdraws its presence', async () => {
    running = await startCollabServer({
      port: 0,
      heartbeat: HEARTBEAT,
      authorityFor: () => editorAuthority(paragraphs('one')),
    });

    const address = `ws://localhost:${running.port().toString()}`;
    const silent = new NodeSocket(address, { autoPong: false });
    const watcher = new WebSocket(address);
    const seen: string[] = [];
    const closes: number[] = [];

    silent.on('open', () => {
      silent.send(hello('room', 'silent'));
      silent.send(JSON.stringify({ kind: ClientMessageKind.Presence, state: 'here' }));
    });

    silent.on('close', (code) => {
      closes.push(code);
    });

    watcher.addEventListener('message', (event) => {
      seen.push(String(event.data));
    });

    watcher.addEventListener('open', () => {
      watcher.send(hello('room', 'watcher'));
    });

    await vi.waitFor(() => {
      expect(seen).toContain(GONE);
      expect(closes).toHaveLength(1);
    }, PATIENCE);

    expect(watcher.readyState).toBe(WebSocket.OPEN);

    watcher.close();
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
