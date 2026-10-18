import { decorationSet, inlineDecoration } from '../decorations/decorations';
import type { DecorationSet } from '../decorations/decorations.types';
import type { Doc } from '../doc/doc.types';
import { createMetaKey, definePlugin } from '../state/plugin';
import { selectionRange } from '../state/selection';
import type { Command, EditorState, Plugin, Transaction } from '../state/state.types';
import type { Anchor, AnchorChange, AnchorJSON, AnchorRange, AnchorsState } from './anchors.types';

const anchorChange = createMetaKey<AnchorChange>('anchors');

const ANCHOR_CLASS = 'nui-editor__comment';

const ACTIVE_CLASS = 'nui-editor__comment--active';

const EMPTY: AnchorsState = { anchors: new Map(), active: undefined };

const movedAnchor = (anchor: Anchor, tr: Transaction): Anchor => {
  const { range } = anchor;

  if (range.kind === 'node') {
    return tr.doc.byId(range.id) === undefined ? { ...anchor, lost: true } : anchor;
  }
  const from = tr.mapping.map(range.from, 1);
  const to = Math.max(from, tr.mapping.map(range.to, -1));

  return { ...anchor, range: { kind: 'text', from, to }, lost: anchor.lost || to === from };
};

const moved = (value: AnchorsState, tr: Transaction): AnchorsState =>
  !tr.changed || value.anchors.size === 0
    ? value
    : {
        ...value,
        anchors: new Map([...value.anchors].map(([id, anchor]) => [id, movedAnchor(anchor, tr)])),
      };

const changed = (value: AnchorsState, change: AnchorChange | undefined): AnchorsState => {
  switch (change?.kind) {
    case 'set':
      return {
        ...value,
        anchors: new Map(value.anchors).set(change.id, {
          id: change.id,
          range: change.range,
          lost: false,
        }),
      };
    case 'remove': {
      const anchors = new Map(value.anchors);

      anchors.delete(change.id);
      return {
        anchors,
        active: value.active === change.id ? undefined : value.active,
      };
    }
    case 'activate':
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
      range.kind === 'text' && !lost
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
    apply: (tr, value) => changed(moved(value, tr), anchorChange.read(tr)),
  },
  props: {
    decorations: (state) => decorationsOf(commentAnchors.getState(state) ?? EMPTY),
  },
});

export const anchorsOf = (state: EditorState): ReadonlyMap<string, Anchor> =>
  (commentAnchors.getState(state) ?? EMPTY).anchors;

export const activeAnchor = (state: EditorState): string | undefined =>
  commentAnchors.getState(state)?.active;

const selectedRange = (state: EditorState): AnchorRange | undefined => {
  const { selection, doc } = state;

  if (selection.kind === 'node') {
    return { kind: 'node', id: selection.id };
  }
  const { from, to } = selectionRange(doc, selection);

  return selection.kind === 'text' && from < to ? { kind: 'text', from, to } : undefined;
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

const covers = (doc: Doc, range: AnchorRange, pos: number): boolean => {
  if (range.kind === 'text') {
    return range.from <= pos && pos <= range.to;
  }
  const node = doc.byId(range.id);
  const at = doc.positionOf(range.id);

  return node !== undefined && at !== undefined && at <= pos && pos <= at + node.size;
};

export const anchorsAt = (state: EditorState, pos: number): readonly string[] =>
  [...anchorsOf(state).values()]
    .filter((anchor) => !anchor.lost && covers(state.doc, anchor.range, pos))
    .map((anchor) => anchor.id);

const pointOf = (doc: Doc, pos: number): { readonly id: string; readonly offset: number } => {
  const place = doc.resolve(pos);

  return { id: place.parent.id, offset: place.parentOffset };
};

export const anchorToJSON = (doc: Doc, range: AnchorRange): AnchorJSON => {
  if (range.kind === 'node') {
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
  if (json.kind === 'node') {
    return doc.byId(json.id) === undefined ? undefined : json;
  }
  const from = positionIn(doc, json.fromId, json.fromOffset);
  const to = positionIn(doc, json.toId, json.toOffset);

  return from === undefined || to === undefined || to < from
    ? undefined
    : { kind: 'text', from, to };
};
