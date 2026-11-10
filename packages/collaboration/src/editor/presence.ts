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
import type {
  BlockPoint,
  EditorPresence,
  PresenceSelection,
  PresenceUser,
  RemotePeer,
} from './presence.types';

type Fields = Readonly<Record<string, unknown>>;

const COLOURS = 8;

const SELECTION_CLASS = 'nui-collab-selection';

const presenceUpdate = createMetaKey<readonly RemotePeer[]>('presenceUpdate');

const registry = new WeakMap<object, Plugin<readonly RemotePeer[]>>();

const NONE: readonly RemotePeer[] = [];

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

const isPresence = (value: unknown): value is EditorPresence =>
  isFields(value) && isUser(value.user) && isSelection(value.selection);

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

const peerOf = (doc: Doc, clientId: string, value: unknown): RemotePeer | undefined => {
  if (!isPresence(value)) {
    return undefined;
  }

  const { user, selection } = value;

  return {
    clientId,
    user,
    colour: colourOf(user.id),
    anchor: selection === null ? undefined : positionOf(doc, selection.anchor),
    head: selection === null ? undefined : positionOf(doc, selection.head),
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

const applyPeers = (tr: Transaction, value: readonly RemotePeer[]): readonly RemotePeer[] => {
  const update = presenceUpdate.read(tr);

  if (update !== undefined) {
    return update;
  }
  return tr.changed && value.length > 0 ? moved(value, tr) : value;
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

export const remotePresence = (): Plugin<readonly RemotePeer[]> => {
  const plugin: Plugin<readonly RemotePeer[]> = definePlugin<readonly RemotePeer[]>({
    name: 'remotePresence',
    state: {
      init: () => NONE,
      apply: applyPeers,
    },
    props: {
      decorations: (state) => selectionDecorations(plugin.getState(state) ?? NONE),
    },
  });

  registry.set(plugin, plugin);
  return plugin;
};

export const remotePeers = (state: EditorState): readonly RemotePeer[] => {
  for (const plugin of state.plugins) {
    const found = registry.get(plugin);

    if (found !== undefined) {
      return found.getState(state) ?? NONE;
    }
  }
  return NONE;
};

export const setRemotePresence = (
  state: EditorState,
  peers: ReadonlyMap<string, unknown>,
): Transaction =>
  state.tr.setMeta(
    presenceUpdate,
    [...peers].reduce<RemotePeer[]>((found, [clientId, value]) => {
      const peer = peerOf(state.doc, clientId, value);

      if (peer !== undefined) {
        found.push(peer);
      }
      return found;
    }, []),
  );

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

export const presenceOf = (state: EditorState, user: PresenceUser): EditorPresence => ({
  user,
  selection: selectionOf(state),
});

export const samePresence = (left: EditorPresence, right: EditorPresence): boolean =>
  JSON.stringify(left.selection) === JSON.stringify(right.selection);
