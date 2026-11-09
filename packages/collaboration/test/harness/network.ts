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
import { createRoom } from '../../server/room';
import {
  collab,
  collabVersion,
  createCollabClient,
  editorCollabDocument,
  sendableSteps,
  type CollabClient,
} from '../../src';
import { createTraffic, createWire, settleAll, type NetworkTraffic } from './wire';

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

export interface CollabNetwork {
  readonly clients: readonly NetworkClient[];
  readonly settle: () => void;
  readonly server: () => unknown;
  readonly docs: () => readonly DocJSON[];
  readonly traffic: () => NetworkTraffic;
}

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
  const traffic = createTraffic();

  const clients = names.map((name): NetworkClient => {
    const wire = createWire(room, name, traffic);

    let state = createState({
      doc,
      plugins: [history(), collab()],
      ids: createIdSource(`${name}-`),
    });

    const client = createCollabClient({
      doc: 'doc',
      clientId: name,
      schema: { name: fixtureSchema.name, version: fixtureSchema.version },
      transport: wire.transport,
      document: editorCollabDocument({
        schema: fixtureSchema,
        getState: () => state,
        dispatch: (tr) => {
          state = state.apply(tr);
        },
        load: () => {},
      }),
    });

    wire.open();

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
      toServer: wire.toServer,
      toClient: wire.toClient,
      pending: () => sendableSteps(state).length,
      version: () => collabVersion(state),
    };
  });

  const settle = (): void => {
    settleAll(clients);
  };

  return {
    clients,
    settle,
    server: authority.snapshot,
    docs: () => clients.map((client) => toJSON(client.state().doc)),
    traffic: () => ({ ...traffic }),
  };
};
