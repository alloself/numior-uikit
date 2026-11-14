import {
  createIdSource,
  createState,
  history,
  type Doc,
  type EditorState,
} from '@numior/editor-core';
import { createLoopback, editorAuthority, type LoopbackLink } from '../../src/room';
import {
  collab,
  createCollabClient,
  editorCollabDocument,
  type CollabStatus,
  type TransportListener,
} from '../../src';
import { RETRY } from './wire';

export interface LoopbackPane {
  readonly link: LoopbackLink;
  readonly type: (text: string, pos: number) => void;
  readonly text: () => string;
  readonly status: () => CollabStatus['kind'];
  readonly stop: () => void;
}

export interface RawLine {
  readonly send: (value: unknown) => void;
  readonly heard: () => readonly unknown[];
  readonly closed: () => boolean;
}

const LATENCY = 5;

export const SETTLE_MS = 200;

const paneOf = (link: LoopbackLink, doc: Doc, name: string): LoopbackPane => {
  let state: EditorState = createState({
    doc,
    plugins: [history(), collab()],
    ids: createIdSource(`${name}-`),
  });

  const client = createCollabClient({
    doc: 'doc',
    clientId: name,
    schema: { name: doc.schema.name, version: doc.schema.version },
    transport: link,
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

  return {
    link,
    type: (text, pos) => {
      const tr = state.tr;

      tr.insertText(text, pos);
      state = state.apply(tr);
      client.sync();
    },
    text: () => state.doc.textBetween(0, state.doc.size, '|'),
    status: () => client.status().kind,
    stop: client.stop,
  };
};

export const createLoopbackPair = (doc: Doc): readonly [LoopbackPane, LoopbackPane] => {
  const loopback = createLoopback({ authorityFor: () => editorAuthority(doc), latency: LATENCY });

  return [paneOf(loopback.link(), doc, 'ann'), paneOf(loopback.link(), doc, 'bob')];
};

export const openRawLine = (doc: Doc): RawLine => {
  const loopback = createLoopback({ authorityFor: () => editorAuthority(doc) });
  const heard: unknown[] = [];
  let closed = false;

  const listener: TransportListener = {
    opened: () => {},
    message: (value) => {
      heard.push(value);
    },
    closed: () => {
      closed = true;
    },
  };

  const connection = loopback.link().open(listener);

  return {
    send: (value) => {
      Reflect.apply(connection.send, connection, [value]);
    },
    heard: () => heard,
    closed: () => closed,
  };
};
