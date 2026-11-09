import {
  createIdSource,
  definePlugin,
  toJSON,
  type Doc,
  type DocJSON,
  type EditorState,
  type IdSource,
  type Plugin,
  type Transaction,
} from '@numior/editor-core';
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { createCollabClient } from '../client/client';
import { CollabStatusKind, type CollabClient, type CollabStatus } from '../client/client.types';
import { collab } from '../editor/collab';
import { editorCollabDocument } from '../editor/editor-document';
import {
  presenceOf,
  remotePeers,
  remotePresence,
  samePresence,
  setRemotePresence,
} from '../editor/presence';
import type { EditorPresence, RemotePeer } from '../editor/presence.types';
import type { CollabEditor, UseCollabEditorOptions } from './collab.types';

const NO_PEERS: readonly RemotePeer[] = [];

const NO_PLUGINS: readonly Plugin[] = [];

const newClientId = (): string => Math.random().toString(36).slice(2, 10);

export const useCollabEditor = (options: UseCollabEditorOptions): CollabEditor => {
  const { doc, user, schema, transport, editor } = options;
  const clientId = newClientId();
  const ready = ref(false);
  const document = shallowRef<DocJSON>();
  const plugins = shallowRef<readonly Plugin[]>(NO_PLUGINS);
  const ids = shallowRef<IdSource>();
  const peers = shallowRef<readonly RemotePeer[]>(NO_PEERS);
  const status = shallowRef<CollabStatus>({ kind: CollabStatusKind.Connecting });

  let client: CollabClient | undefined;
  let latest: EditorState | undefined;
  let present: ReadonlyMap<string, unknown> = new Map();
  let sentPresence: EditorPresence | undefined;

  const dispatch = (tr: Transaction): void => {
    editor()?.run((_state, apply) => {
      apply?.(tr);
      return true;
    });
  };

  const offerPresence = (state: EditorState): void => {
    const next = presenceOf(state, user);

    if (sentPresence === undefined || !samePresence(sentPresence, next)) {
      sentPresence = next;
      client?.setPresence(next);
    }
  };

  const bridge = definePlugin({
    name: 'collabBridge',
    props: {
      stateChanged: (state, before) => {
        latest = state;
        peers.value = remotePeers(state);

        if (state.doc !== before.doc) {
          client?.sync();
        }
        if (state.doc !== before.doc || state.selection !== before.selection) {
          offerPresence(state);
        }
      },
    },
  });

  const load = (loaded: Doc, version: number): void => {
    ids.value = createIdSource(`${clientId}-`);
    plugins.value = [collab({ version }), remotePresence(), bridge];
    document.value = toJSON(loaded);
    ready.value = true;
  };

  onMounted(() => {
    client = createCollabClient({
      doc,
      clientId,
      schema: { name: schema.name, version: schema.version },
      transport,
      document: editorCollabDocument({ schema, getState: () => latest, dispatch, load }),
      onStatus: (next) => {
        status.value = next;
      },
      onPresence: (next) => {
        present = next;

        if (latest !== undefined) {
          dispatch(setRemotePresence(latest, next));
        }
      },
    });
  });

  watch(editor, (api) => {
    latest = api?.state();

    if (latest !== undefined) {
      dispatch(setRemotePresence(latest, present));
      client?.refresh();
      offerPresence(latest);
    }
  });

  onBeforeUnmount(() => {
    client?.stop();
  });

  return { ready, document, plugins, ids, peers, status };
};
