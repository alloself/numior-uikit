import {
  SelectionKind,
  createMetaKey,
  decorationSet,
  definePlugin,
  followPosition,
  inlineDecoration,
  mirrored,
  remoteChain,
  textPosition,
  type DecorationSet,
  type Doc,
  type EditorState,
  type Mappable,
  type Plugin,
  type Transaction,
} from '@numior/editor-core';
import { collabProgress, collabVersionAfter } from './collab';
import type {
  BlockPoint,
  EditorPresence,
  PresenceSelection,
  PresenceUser,
  RemotePeer,
} from './presence.types';

type Fields = Readonly<Record<string, unknown>>;

interface PresenceState {
  readonly peers: readonly RemotePeer[];
  readonly held: ReadonlyMap<string, EditorPresence>;
}

const COLOURS = 8;

const SELECTION_CLASS = 'nui-collab-selection';

const presenceUpdate = createMetaKey<ReadonlyMap<string, unknown>>('presenceUpdate');

const registry = new WeakMap<object, Plugin<PresenceState>>();

const NONE: readonly RemotePeer[] = [];

const NO_HELD: ReadonlyMap<string, EditorPresence> = new Map();

const IDLE: PresenceState = { peers: NONE, held: NO_HELD };

const NO_SELECTIONS = decorationSet([]);

const drawn = new WeakMap<readonly RemotePeer[], DecorationSet>();

const isFields = (value: unknown): value is Fields =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isUser = (value: unknown): value is PresenceUser =>
  isFields(value) &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  (value.avatar === undefined || typeof value.avatar === 'string');

const isPoint = (value: unknown): value is BlockPoint =>
  isFields(value) &&
  typeof value.block === 'string' &&
  typeof value.offset === 'number' &&
  Number.isInteger(value.offset) &&
  value.offset >= 0;

const isSelection = (value: unknown): value is PresenceSelection | null =>
  value === null || (isFields(value) && isPoint(value.anchor) && isPoint(value.head));

const isVersion = (value: unknown): value is number | undefined =>
  value === undefined || (typeof value === 'number' && Number.isInteger(value) && value >= 0);

const isPresence = (value: unknown): value is EditorPresence =>
  isFields(value) && isUser(value.user) && isSelection(value.selection) && isVersion(value.version);

const colourOf = (id: string): number =>
  (Array.from(id).reduce((sum, char) => sum * 31 + (char.codePointAt(0) ?? 0), 7) >>> 0) % COLOURS;

const pointAt = (doc: Doc, pos: number): BlockPoint => {
  const $pos = doc.resolve(pos);

  return { block: $pos.parent.id, offset: $pos.parentOffset };
};

const positionOf = (doc: Doc, point: BlockPoint): number | undefined => {
  const node = doc.byId(point.block);
  const start = doc.positionOf(point.block);

  return node === undefined || start === undefined
    ? undefined
    : start + 1 + Math.min(point.offset, Math.max(0, node.size - 2));
};

const peerOf = (doc: Doc, clientId: string, { user, selection }: EditorPresence): RemotePeer => ({
  clientId,
  user,
  colour: colourOf(user.id),
  anchor: selection === null ? undefined : positionOf(doc, selection.anchor),
  head: selection === null ? undefined : positionOf(doc, selection.head),
});

const unplaced = (clientId: string, { user }: EditorPresence): RemotePeer => ({
  clientId,
  user,
  colour: colourOf(user.id),
  anchor: undefined,
  head: undefined,
});

const stated = (
  values: ReadonlyMap<string, unknown>,
  known: PresenceState,
  doc: Doc,
  version: number,
): PresenceState => {
  const held = new Map<string, EditorPresence>();

  const peers = [...values].reduce<RemotePeer[]>((found, [clientId, value]) => {
    if (!isPresence(value)) {
      return found;
    }
    if ((value.version ?? 0) > version) {
      held.set(clientId, value);

      found.push(
        known.peers.find((peer) => peer.clientId === clientId) ?? unplaced(clientId, value),
      );
    } else {
      found.push(peerOf(doc, clientId, value));
    }
    return found;
  }, []);

  return { peers, held: held.size === 0 ? NO_HELD : held };
};

const released = (value: PresenceState, doc: Doc, version: number): PresenceState => {
  const held = new Map<string, EditorPresence>();
  const ready = new Map<string, EditorPresence>();

  value.held.forEach((presence, clientId) => {
    if ((presence.version ?? 0) > version) {
      held.set(clientId, presence);
    } else {
      ready.set(clientId, presence);
    }
  });

  if (ready.size === 0) {
    return value;
  }

  return {
    peers: value.peers.map((peer) => {
      const presence = ready.get(peer.clientId);

      return presence === undefined ? peer : peerOf(doc, peer.clientId, presence);
    }),
    held: held.size === 0 ? NO_HELD : held,
  };
};

const mappingOf = (tr: Transaction): Mappable => {
  const chain = remoteChain.read(tr);

  return chain === undefined ? tr.mapping : mirrored(chain);
};

const moved = (peers: readonly RemotePeer[], tr: Transaction): readonly RemotePeer[] => {
  const mapping = mappingOf(tr);

  const next = peers.map((peer) => {
    const anchor =
      peer.anchor === undefined
        ? undefined
        : followPosition(peer.anchor, mapping, tr.before, tr.doc);

    const head =
      peer.head === undefined ? undefined : followPosition(peer.head, mapping, tr.before, tr.doc);

    return anchor === peer.anchor && head === peer.head ? peer : { ...peer, anchor, head };
  });

  return next.every((peer, index) => peer === peers[index]) ? peers : next;
};

const applyPresence = (
  tr: Transaction,
  value: PresenceState,
  before: EditorState,
): PresenceState => {
  const update = presenceUpdate.read(tr);
  const version = collabVersionAfter(tr, before) ?? Infinity;

  if (update !== undefined) {
    return stated(update, value, tr.doc, version);
  }

  const peers = tr.changed && value.peers.length > 0 ? moved(value.peers, tr) : value.peers;
  const next = peers === value.peers ? value : { ...value, peers };

  return next.held.size === 0 ? next : released(next, tr.doc, version);
};

const selectionRanges = (peers: readonly RemotePeer[]): ReturnType<typeof inlineDecoration>[] =>
  peers.reduce<ReturnType<typeof inlineDecoration>[]>((found, peer) => {
    if (peer.anchor !== undefined && peer.head !== undefined && peer.anchor !== peer.head) {
      found.push(
        inlineDecoration(
          Math.min(peer.anchor, peer.head),
          Math.max(peer.anchor, peer.head),
          `${SELECTION_CLASS} nui-collab-colour--${peer.colour.toString()}`,
        ),
      );
    }
    return found;
  }, []);

const selectionDecorations = (peers: readonly RemotePeer[]): DecorationSet => {
  const known = drawn.get(peers);

  if (known !== undefined) {
    return known;
  }

  const ranges = selectionRanges(peers);
  const set = ranges.length === 0 ? NO_SELECTIONS : decorationSet(ranges);

  drawn.set(peers, set);
  return set;
};

export const remotePresence = (): Plugin<PresenceState> => {
  const plugin: Plugin<PresenceState> = definePlugin<PresenceState>({
    name: 'remotePresence',
    state: {
      init: () => IDLE,
      apply: applyPresence,
    },
    props: {
      decorations: (state) => selectionDecorations((plugin.getState(state) ?? IDLE).peers),
    },
  });

  registry.set(plugin, plugin);
  return plugin;
};

export const remotePeers = (state: EditorState): readonly RemotePeer[] => {
  for (const plugin of state.plugins) {
    const found = registry.get(plugin);

    if (found !== undefined) {
      return (found.getState(state) ?? IDLE).peers;
    }
  }
  return NONE;
};

export const setRemotePresence = (
  state: EditorState,
  peers: ReadonlyMap<string, unknown>,
): Transaction => state.tr.setMeta(presenceUpdate, peers);

const wholeDocument = (doc: Doc): PresenceSelection | null => {
  const anchor = textPosition(doc, 0, 1);
  const head = textPosition(doc, doc.size, -1);

  return anchor === undefined || head === undefined
    ? null
    : { anchor: pointAt(doc, anchor), head: pointAt(doc, head) };
};

const selectionOf = ({ selection, doc }: EditorState): PresenceSelection | null => {
  switch (selection.kind) {
    case SelectionKind.Text:
      return { anchor: pointAt(doc, selection.anchor), head: pointAt(doc, selection.head) };
    case SelectionKind.All:
      return wholeDocument(doc);
    default:
      return null;
  }
};

export const presenceOf = (state: EditorState, user: PresenceUser): EditorPresence => {
  const progress = collabProgress(state);
  const selection = selectionOf(state);

  return progress === undefined
    ? { user, selection }
    : { user, selection, version: progress.version + progress.pending };
};

export const samePresence = (left: EditorPresence, right: EditorPresence): boolean =>
  JSON.stringify(left.selection) === JSON.stringify(right.selection);

export const presenceChanged = (
  sent: EditorPresence,
  next: EditorPresence,
  state: EditorState,
): boolean => {
  const told = sent.version ?? 0;
  const now = next.version ?? 0;

  return (
    !samePresence(sent, next) ||
    told > now ||
    (told < now && (collabProgress(state)?.pending ?? 0) > 0)
  );
};
