import {
  createIdSource,
  definePlugin,
  fromJSON,
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
import {
  CollabBlockKind,
  CollabRestoreKind,
  CollabStatusKind,
  type CollabAlternative,
  type CollabClient,
  type CollabReport,
  type CollabStatus,
  type CollabTracking,
} from '../client/client.types';
import { collab } from '../editor/collab';
import type { UnconfirmedStep } from '../editor/collab.types';
import { editorCollabDocument } from '../editor/editor-document';
import {
  presenceOf,
  remotePeers,
  remotePresence,
  samePresence,
  setRemotePresence,
} from '../editor/presence';
import type { EditorPresence, RemotePeer } from '../editor/presence.types';
import { restoredDocument } from '../editor/restored';
import type { CollabAlternatives, CollabEditor, UseCollabEditorOptions } from './collab.types';

const NO_PEERS: readonly RemotePeer[] = [];

const NO_PLUGINS: readonly Plugin[] = [];

const NO_ALTERNATIVES: readonly CollabAlternative[] = [];

const newClientId = (): string => Math.random().toString(36).slice(2, 10);

export const useCollabEditor = (options: UseCollabEditorOptions): CollabEditor => {
  const { doc, user, schema, transport, editor, persistence } = options;
  const sessionId = newClientId();
  const ready = ref(false);
  const document = shallowRef<DocJSON>();
  const plugins = shallowRef<readonly Plugin[]>(NO_PLUGINS);
  const ids = shallowRef<IdSource>();
  const peers = shallowRef<readonly RemotePeer[]>(NO_PEERS);
  const status = shallowRef<CollabStatus>({ kind: CollabStatusKind.Connecting });
  const overwritten = shallowRef<readonly CollabAlternative[]>(NO_ALTERNATIVES);
  const readOnly = ref(false);
  const report = shallowRef<CollabReport>();

  let clientId = sessionId;
  let client: CollabClient | undefined;
  let tracking: CollabTracking | undefined;
  let latest: EditorState | undefined;
  let present: ReadonlyMap<string, unknown> = new Map();
  let sentPresence: EditorPresence | undefined;
  let awaitingEditor = false;
  let stopped = false;

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
          tracking?.changed();
        }
        if (state.doc !== before.doc || state.selection !== before.selection) {
          offerPresence(state);
        }
      },
    },
  });

  const load = (loaded: Doc, version: number, unconfirmed?: readonly UnconfirmedStep[]): void => {
    ids.value = createIdSource(`${sessionId}-`);
    plugins.value = [collab({ version, unconfirmed }), remotePresence(), bridge];
    document.value = toJSON(loaded);
    ready.value = true;
  };

  const connect = (): void => {
    const inner = editorCollabDocument({
      schema,
      getState: () => latest,
      dispatch,
      load,
      authorOf: (id) => peers.value.find((peer) => peer.clientId === id)?.user,
      onAlternatives: (found) => {
        overwritten.value = [...found, ...overwritten.value];
        tracking?.record(found);
      },
    });

    tracking = persistence?.track(inner, clientId);

    client = createCollabClient({
      doc,
      clientId,
      schema: { name: schema.name, version: schema.version },
      transport,
      document: tracking?.document ?? inner,
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
  };

  const openBlocked = async (
    blocked: CollabReport,
    snapshot: unknown,
    version: number,
  ): Promise<void> => {
    await persistence?.close();

    if (stopped) {
      return;
    }

    report.value = blocked;
    readOnly.value = true;

    const read = snapshot === undefined ? undefined : fromJSON(schema, snapshot);

    if (read?.ok === true) {
      status.value = { kind: CollabStatusKind.Offline };
      load(read.doc, version);
    } else {
      connect();
    }
  };

  const begin = async (): Promise<void> => {
    const restored = await persistence?.restore();

    if (stopped) {
      return;
    }
    if (restored === undefined) {
      connect();
      return;
    }
    if (restored.kind === CollabRestoreKind.Blocked) {
      await openBlocked(restored.report, restored.snapshot, restored.version);
      return;
    }

    const recovered = restoredDocument(schema, restored);

    if (recovered === undefined) {
      await openBlocked(
        { blocks: [{ kind: CollabBlockKind.Damaged }], unsent: restored.pending.length },
        undefined,
        restored.version,
      );

      return;
    }
    clientId = restored.clientId;
    overwritten.value = restored.alternatives;
    awaitingEditor = true;
    load(recovered.doc, restored.version, recovered.unconfirmed);
  };

  const dismiss = (alternative: CollabAlternative): void => {
    overwritten.value = overwritten.value.filter((item) => item !== alternative);
    tracking?.forget(alternative);
  };

  const alternatives: CollabAlternatives = {
    list: overwritten,
    apply: (alternative) => {
      const position = latest?.doc.positionOf(alternative.nodeId);

      if (latest !== undefined && position !== undefined) {
        dispatch(latest.tr.setNodeAttrs(position, { [alternative.attr]: alternative.value }));
      }
      dismiss(alternative);
    },
    dismiss,
    reveal: (alternative) => {
      editor()?.revealNode(alternative.nodeId);
    },
  };

  onMounted(() => {
    void begin();
  });

  watch(editor, (api) => {
    latest = api?.state();

    if (latest === undefined) {
      return;
    }
    if (awaitingEditor) {
      awaitingEditor = false;
      connect();
    }
    dispatch(setRemotePresence(latest, present));
    client?.refresh();
    offerPresence(latest);
  });

  onBeforeUnmount(() => {
    stopped = true;
    client?.stop();
    void persistence?.close();
  });

  return { ready, document, plugins, ids, peers, status, alternatives, readOnly, report };
};
