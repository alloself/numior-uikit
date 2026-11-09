import { decorationSet, inlineDecoration } from '../decorations/decorations';
import type { DecorationSet } from '../decorations/decorations.types';
import type { Doc } from '../doc/doc.types';
import { remoteChain } from '../history/history';
import { mirrored } from '../history/rebase';
import { createMetaKey, definePlugin } from '../state/plugin';
import { selectionRange, textPosition } from '../state/selection';
import {
  SelectionKind,
  type Command,
  type EditorState,
  type Plugin,
  type Transaction,
} from '../state/state.types';
import type { Mappable } from '../transform/mapping.types';
import {
  AnchorChangeKind,
  AnchorRangeKind,
  type Anchor,
  type AnchorChange,
  type AnchorJSON,
  type AnchorRange,
  type AnchorsState,
} from './anchors.types';

const anchorChange = createMetaKey<AnchorChange>('anchors');

const ANCHOR_CLASS = 'nui-editor__comment';

const ACTIVE_CLASS = 'nui-editor__comment--active';

const EMPTY: AnchorsState = { anchors: new Map(), active: undefined };

const mapperOf = (tr: Transaction): Mappable => {
  const chain = remoteChain.read(tr);

  return chain === undefined ? tr.mapping : mirrored(chain);
};

const movedAnchor = (anchor: Anchor, tr: Transaction, mapper: Mappable): Anchor => {
  const { range } = anchor;

  if (range.kind === AnchorRangeKind.Node) {
    return tr.doc.byId(range.id) === undefined ? { ...anchor, lost: true } : anchor;
  }
  const from = mapper.map(range.from, 1);
  const to = Math.max(from, mapper.map(range.to, -1));

  return { ...anchor, range: { kind: 'text', from, to }, lost: anchor.lost || to === from };
};

const moved = (value: AnchorsState, tr: Transaction): AnchorsState => {
  if (!tr.changed || value.anchors.size === 0) {
    return value;
  }

  const mapper = mapperOf(tr);

  return {
    ...value,
    anchors: new Map(
      [...value.anchors].map(([id, anchor]) => [id, movedAnchor(anchor, tr, mapper)]),
    ),
  };
};

const covers = (doc: Doc, range: AnchorRange, pos: number): boolean => {
  if (range.kind === AnchorRangeKind.Text) {
    return range.from <= pos && pos <= range.to;
  }
  const node = doc.byId(range.id);
  const at = doc.positionOf(range.id);

  return node !== undefined && at !== undefined && at <= pos && pos <= at + node.size;
};

const anchorUnder = (value: AnchorsState, doc: Doc, pos: number): string | undefined => {
  for (const anchor of value.anchors.values()) {
    if (!anchor.lost && covers(doc, anchor.range, pos)) {
      return anchor.id;
    }
  }
  return undefined;
};

const followed = (value: AnchorsState, tr: Transaction): AnchorsState => {
  const { selection } = tr;

  if (
    !tr.selectionSet ||
    value.anchors.size === 0 ||
    selection.kind !== SelectionKind.Text ||
    selection.anchor !== selection.head
  ) {
    return value;
  }

  const active = anchorUnder(value, tr.doc, selection.head);

  return active === value.active ? value : { ...value, active };
};

const changed = (value: AnchorsState, change: AnchorChange | undefined): AnchorsState => {
  switch (change?.kind) {
    case AnchorChangeKind.Set:
      return {
        ...value,
        anchors: new Map(value.anchors).set(change.id, {
          id: change.id,
          range: change.range,
          lost: false,
        }),
      };
    case AnchorChangeKind.Remove: {
      const anchors = new Map(value.anchors);

      anchors.delete(change.id);
      return {
        anchors,
        active: value.active === change.id ? undefined : value.active,
      };
    }
    case AnchorChangeKind.Activate:
      return { ...value, active: change.id };
    case undefined:
      return value;
  }
};

const sets = new WeakMap<AnchorsState, DecorationSet>();

const decorationsOf = (value: AnchorsState): DecorationSet => {
  const known = sets.get(value);

  if (known !== undefined) {
    return known;
  }

  const set = decorationSet(
    [...value.anchors.values()].flatMap(({ id, range, lost }) =>
      range.kind === AnchorRangeKind.Text && !lost
        ? [
            inlineDecoration(
              range.from,
              range.to,
              id === value.active ? `${ANCHOR_CLASS} ${ACTIVE_CLASS}` : ANCHOR_CLASS,
              'mark',
            ),
          ]
        : [],
    ),
  );

  sets.set(value, set);
  return set;
};

export const commentAnchors: Plugin<AnchorsState> = definePlugin<AnchorsState>({
  name: 'anchors',
  state: {
    init: () => EMPTY,
    apply: (tr, value) => changed(followed(moved(value, tr), tr), anchorChange.read(tr)),
  },
  props: {
    decorations: (state) => decorationsOf(commentAnchors.getState(state) ?? EMPTY),
  },
});

export const anchorsOf = (state: EditorState): ReadonlyMap<string, Anchor> =>
  (commentAnchors.getState(state) ?? EMPTY).anchors;

export const activeAnchor = (state: EditorState): string | undefined =>
  commentAnchors.getState(state)?.active;

const wholeTextRange = (doc: Doc): AnchorRange | undefined => {
  const from = textPosition(doc, 0, 1);
  const to = textPosition(doc, doc.size, -1);

  return from === undefined || to === undefined || from >= to
    ? undefined
    : { kind: 'text', from, to };
};

const selectedRange = (state: EditorState): AnchorRange | undefined => {
  const { selection, doc } = state;

  if (selection.kind === SelectionKind.Node) {
    return { kind: 'node', id: selection.id };
  }
  if (selection.kind === SelectionKind.All) {
    return wholeTextRange(doc);
  }
  const { from, to } = selectionRange(doc, selection);

  return selection.kind === SelectionKind.Text && from < to
    ? { kind: 'text', from, to }
    : undefined;
};

const sent =
  (change: AnchorChange): Command =>
  (state, dispatch) => {
    dispatch?.(state.tr.setMeta(anchorChange, change));
    return true;
  };

export const setAnchor =
  (id: string, range?: AnchorRange): Command =>
  (state, dispatch) => {
    const target = range ?? selectedRange(state);

    return target !== undefined && sent({ kind: 'set', id, range: target })(state, dispatch);
  };

export const removeAnchor =
  (id: string): Command =>
  (state, dispatch) =>
    anchorsOf(state).has(id) && sent({ kind: 'remove', id })(state, dispatch);

export const activateAnchor =
  (id: string | undefined): Command =>
  (state, dispatch) =>
    (id === undefined || anchorsOf(state).has(id)) &&
    sent({ kind: 'activate', id })(state, dispatch);

export const anchorsAt = (state: EditorState, pos: number): readonly string[] =>
  [...anchorsOf(state).values()].reduce<string[]>((found, anchor) => {
    if (!anchor.lost && covers(state.doc, anchor.range, pos)) {
      found.push(anchor.id);
    }
    return found;
  }, []);

const pointOf = (doc: Doc, pos: number): { readonly id: string; readonly offset: number } => {
  const place = doc.resolve(pos);

  return { id: place.parent.id, offset: place.parentOffset };
};

export const anchorToJSON = (doc: Doc, range: AnchorRange): AnchorJSON => {
  if (range.kind === AnchorRangeKind.Node) {
    return range;
  }
  const from = pointOf(doc, range.from);
  const to = pointOf(doc, range.to);

  return {
    kind: 'text',
    fromId: from.id,
    fromOffset: from.offset,
    toId: to.id,
    toOffset: to.offset,
  };
};

const positionIn = (doc: Doc, id: string, offset: number): number | undefined => {
  const node = doc.byId(id);
  const at = doc.positionOf(id);

  return node === undefined || at === undefined || offset < 0 || offset > node.size - 2
    ? undefined
    : at + 1 + offset;
};

export const anchorFromJSON = (doc: Doc, json: AnchorJSON): AnchorRange | undefined => {
  if (json.kind === AnchorRangeKind.Node) {
    return doc.byId(json.id) === undefined ? undefined : json;
  }
  const from = positionIn(doc, json.fromId, json.fromOffset);
  const to = positionIn(doc, json.toId, json.toOffset);

  return from === undefined || to === undefined || to < from
    ? undefined
    : { kind: 'text', from, to };
};
