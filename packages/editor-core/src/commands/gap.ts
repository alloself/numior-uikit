import type { Doc } from '../doc/doc.types';
import { emptyTextblock } from '../doc/empty';
import { nodeSize } from '../model/node';
import type { ContentNode, ElementNode } from '../model/node.types';
import { nearestCursor, textSelection } from '../state/selection';
import type { GapSide, Selection } from '../state/selection.types';
import type { Command, Transaction } from '../state/state.types';
import { isBlockAtom } from './atoms';
import { attempt } from './attempt';

export interface GapSpot {
  readonly node: ElementNode;
  readonly side: GapSide;
  readonly at: number;
  readonly pos: number;
  readonly parent: ElementNode;
  readonly index: number;
}

export const gapSpot = (doc: Doc, selection: Selection): GapSpot | undefined => {
  const node = selection.kind === 'gap' ? doc.byId(selection.id) : undefined;
  const at = node === undefined ? undefined : doc.positionOf(node.id);

  if (selection.kind !== 'gap' || node === undefined || at === undefined) {
    return undefined;
  }
  const place = doc.resolve(at);

  return {
    node,
    side: selection.side,
    at,
    pos: selection.side === 'start' ? at : at + nodeSize(node),
    parent: place.parent,
    index: place.index,
  };
};

const lineOf = (tr: Transaction, text: string): ElementNode | undefined => {
  const { schema } = tr.doc;
  const block = emptyTextblock(schema, tr.newId());

  return block === undefined || text === ''
    ? block
    : schema.element(block.type, { id: block.id, content: [schema.text(text)] });
};

export const openGapLine = (tr: Transaction, text = ''): boolean => {
  const spot = gapSpot(tr.doc, tr.selection);
  const line = spot === undefined ? undefined : lineOf(tr, text);

  if (spot === undefined || line === undefined) {
    return false;
  }
  tr.insert(spot.pos, [line]);
  tr.setSelection(textSelection(spot.pos + 1 + text.length));
  return true;
};

export const gapText =
  (text: string): Command =>
  (state, dispatch) =>
    state.selection.kind === 'gap' && attempt(state, dispatch, (tr) => openGapLine(tr, text));

export const gapEnter: Command = (state, dispatch) => {
  const spot = gapSpot(state.doc, state.selection);

  if (spot === undefined) {
    return false;
  }
  return attempt(state, dispatch, (tr) => {
    if (spot.side === 'end') {
      return openGapLine(tr);
    }
    const line = lineOf(tr, '');

    if (line === undefined) {
      return false;
    }
    tr.insert(spot.pos, [line]);
    tr.setSelection(state.selection);
    return true;
  });
};

const isEmptyTextblock = (doc: Doc, node: ContentNode): boolean =>
  node.kind === 'element' &&
  node.content.length === 0 &&
  doc.schema.nodes.get(node.type)?.inlineContent === true;

const stepOut = (
  state: Parameters<Command>[0],
  spot: GapSpot,
  backward: boolean,
): Selection | ((tr: Transaction) => boolean) | undefined => {
  const neighbour = spot.parent.content[spot.index + (backward ? -1 : 1)];

  if (neighbour === undefined) {
    return undefined;
  }
  if (isEmptyTextblock(state.doc, neighbour)) {
    const from = backward ? spot.pos - nodeSize(neighbour) : spot.pos;

    return (tr) => {
      tr.delete(from, from + nodeSize(neighbour));
      return tr.changed;
    };
  }
  return isBlockAtom(state.doc.schema, neighbour)
    ? { kind: 'node', id: neighbour.id }
    : nearestCursor(state.doc, spot.pos, backward ? -1 : 1);
};

export const gapDelete =
  (backward: boolean): Command =>
  (state, dispatch) => {
    const spot = gapSpot(state.doc, state.selection);

    if (spot === undefined) {
      return false;
    }
    if (backward ? spot.side === 'end' : spot.side === 'start') {
      dispatch?.(state.tr.setSelection({ kind: 'node', id: spot.node.id }));
      return true;
    }
    const step = stepOut(state, spot, backward);

    if (typeof step === 'function') {
      attempt(state, dispatch, step);
      return true;
    }
    if (step !== undefined) {
      dispatch?.(state.tr.setSelection(step));
    }
    return true;
  };

export const insertAtGap = (tr: Transaction, build: (tr: Transaction) => ElementNode): boolean => {
  const spot = gapSpot(tr.doc, tr.selection);

  if (spot === undefined) {
    return false;
  }
  const block = build(tr);

  tr.insert(spot.pos, [block]);

  tr.setSelection(
    isBlockAtom(tr.doc.schema, block)
      ? { kind: 'gap', id: block.id, side: 'end' }
      : nearestCursor(tr.doc, spot.pos + 1, 1),
  );

  return true;
};
