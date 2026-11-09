import {
  createDoc,
  createIdSource,
  createState,
  history,
  toJSON,
  type Command,
  type Doc,
  type DocJSON,
  type EditorState,
  type Transaction,
} from '@numior/editor-core';
import { fixtureSchema } from '@numior/editor-core/fixtures';
import { editorAuthority } from '../../server/authority';
import { createRoom, type RoomPeer } from '../../server/room';
import {
  ClientMessageKind,
  ServerMessageKind,
  collab,
  collabVersion,
  createCollabClient,
  editorCollabDocument,
  sendableSteps,
  type ClientMessage,
  type CollabClient,
  type ServerMessage,
  type TransportListener,
} from '../../src';

export interface NetworkClient {
  readonly state: () => EditorState;
  readonly status: CollabClient['status'];
  readonly edit: (change: (tr: Transaction) => void) => void;
  readonly run: (command: Command) => boolean;
  readonly toServer: () => boolean;
  readonly toClient: () => boolean;
  readonly pending: () => number;
  readonly version: () => number;
}

export interface NetworkTraffic {
  readonly submits: number;
  readonly rejections: number;
  readonly deliveries: number;
}

export interface CollabNetwork {
  readonly clients: readonly NetworkClient[];
  readonly settle: () => void;
  readonly server: () => unknown;
  readonly docs: () => readonly DocJSON[];
  readonly traffic: () => NetworkTraffic;
}

const overTheWire = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

export const paragraphs = (...texts: readonly string[]): Doc =>
  createDoc(
    fixtureSchema,
    fixtureSchema.element(fixtureSchema.top.name, {
      id: 'root',
      content: texts.map((text, index) =>
        fixtureSchema.element('paragraph', {
          id: `p${index.toString()}`,
          content: [fixtureSchema.text(text)],
        }),
      ),
    }),
  );

export const createNetwork = (doc: Doc, names: readonly string[]): CollabNetwork => {
  const authority = editorAuthority(doc);
  const room = createRoom(authority);
  const traffic = { submits: 0, rejections: 0, deliveries: 0 };

  const clients = names.map((name): NetworkClient => {
    const toServer: ClientMessage[] = [];
    const toClient: ServerMessage[] = [];
    let listener: TransportListener | undefined;

    let state = createState({
      doc,
      plugins: [history(), collab()],
      ids: createIdSource(`${name}-`),
    });

    const peer: RoomPeer = {
      clientId: name,
      send: (message) => {
        toClient.push(message);
      },
    };

    const client = createCollabClient({
      doc: 'doc',
      clientId: name,
      schema: { name: fixtureSchema.name, version: fixtureSchema.version },
      transport: {
        open: (opened) => {
          listener = opened;

          return {
            send: (message) => {
              toServer.push(message);
            },
            close: () => {
              listener = undefined;
            },
          };
        },
      },
      document: editorCollabDocument({
        schema: fixtureSchema,
        getState: () => state,
        dispatch: (tr) => {
          state = state.apply(tr);
        },
        load: () => {},
      }),
    });

    listener?.opened();

    return {
      state: () => state,
      status: client.status,
      edit: (change) => {
        const tr = state.tr;

        change(tr);
        state = state.apply(tr);
        client.sync();
      },
      run: (command) => {
        const done = command(state, (tr) => {
          state = state.apply(tr);
        });

        client.sync();
        return done;
      },
      toServer: () => {
        const message = toServer.shift();

        if (message === undefined) {
          return false;
        }
        if (message.kind === ClientMessageKind.Hello) {
          room.join(peer, message);
        } else {
          traffic.submits += Number(message.kind === ClientMessageKind.Steps);
          room.receive(peer, message);
        }
        return true;
      },
      toClient: () => {
        const message = toClient.shift();

        if (message === undefined) {
          return false;
        }
        traffic.rejections += Number(message.kind === ServerMessageKind.Rejected);
        traffic.deliveries += 1;
        listener?.message(overTheWire(message));
        return true;
      },
      pending: () => sendableSteps(state).length,
      version: () => collabVersion(state),
    };
  });

  const settle = (): void => {
    let moved = true;

    while (moved) {
      moved = clients.reduce(
        (any, client) => [client.toServer(), client.toClient()].some(Boolean) || any,
        false,
      );
    }
  };

  return {
    clients,
    settle,
    server: authority.snapshot,
    docs: () => clients.map((client) => toJSON(client.state().doc)),
    traffic: () => ({ ...traffic }),
  };
};
