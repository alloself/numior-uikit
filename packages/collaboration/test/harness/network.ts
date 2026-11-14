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
import { createRoom, editorAuthority } from '../../src/room';
import {
  collab,
  collabVersion,
  createCollabClient,
  editorCollabDocument,
  sendableSteps,
  type CollabClient,
} from '../../src';
import { RETRY, createTraffic, createWire, mendAll, settleAll, type NetworkTraffic } from './wire';

export interface NetworkClient {
  readonly state: () => EditorState;
  readonly status: CollabClient['status'];
  readonly edit: (change: (tr: Transaction) => void) => void;
  readonly run: (command: Command) => boolean;
  readonly toServer: () => boolean;
  readonly toClient: () => boolean;
  readonly cut: () => void;
  readonly relink: () => void;
  readonly late: () => boolean;
  readonly pending: () => number;
  readonly version: () => number;
  readonly stop: () => void;
}

export interface CollabNetwork {
  readonly clients: readonly NetworkClient[];
  readonly settle: () => void;
  readonly mend: () => void;
  readonly close: () => void;
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
      schema: { name: doc.schema.name, version: doc.schema.version },
      transport: wire.transport,
      retry: RETRY,
      document: editorCollabDocument({
        schema: doc.schema,
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
      cut: wire.cut,
      relink: wire.relink,
      late: wire.late,
      pending: () => sendableSteps(state).length,
      version: () => collabVersion(state),
      stop: client.stop,
    };
  });

  const settle = (): void => {
    settleAll(clients);
  };

  const mend = (): void => {
    mendAll(clients);
  };

  const close = (): void => {
    clients.forEach((client) => {
      client.stop();
    });
  };

  return {
    clients,
    settle,
    mend,
    close,
    server: authority.snapshot,
    docs: () => clients.map((client) => toJSON(client.state().doc)),
    traffic: () => ({ ...traffic }),
  };
};
