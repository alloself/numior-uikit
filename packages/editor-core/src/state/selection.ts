import type { Doc } from '../doc/doc.types';
import { childIndexAt, childOffsets, nodeSize } from '../model/node';
import {
  ContentNodeKind,
  type ContentNode,
  type ElementNode,
  type NodeId,
} from '../model/node.types';
import type { Assoc, Mappable } from '../transform/mapping.types';
import { GapSide, type Selection, type SelectionRange } from './selection.types';
import { SelectionKind } from './state.types';

export const textSelection = (anchor: number, head = anchor): Selection => ({
  kind: 'text',
  anchor,
  head,
});

const inText = (doc: Doc, pos: number): boolean =>
  pos >= 0 &&
  pos <= doc.size &&
  doc.schema.nodes.get(doc.resolve(pos).parent.type)?.inlineContent === true;

const blockAround = (doc: Doc, id: NodeId): SelectionRange | undefined => {
  const node = doc.byId(id);
  const pos = doc.positionOf(id);

  return node === undefined || pos === undefined ? undefined : { from: pos, to: pos + node.size };
};

const isTextblock = (doc: Doc, node: ContentNode): node is ElementNode =>
  node.kind === ContentNodeKind.Element && doc.schema.nodes.get(node.type)?.inlineContent === true;

const firstTextblockIn = (
  doc: Doc,
  node: ElementNode,
  start: number,
  from: number,
  to: number,
): number | undefined => {
  const offsets = childOffsets(node);
  const { content } = node;
  let index = childIndexAt(node, Math.max(0, from - start));
  let childStart = start + (offsets[index] ?? 0);

  while (index < content.length && childStart < to) {
    const child = content[index];

    if (child?.kind === ContentNodeKind.Element) {
      const found = isTextblock(doc, child)
        ? childStart + 1
        : firstTextblockIn(doc, child, childStart + 1, from, to);

      if (found !== undefined) {
        return found;
      }
    }
    index += 1;
    childStart = start + (offsets[index] ?? 0);
  }
  return undefined;
};

const lastTextblockIn = (
  doc: Doc,
  node: ElementNode,
  start: number,
  from: number,
  to: number,
): number | undefined => {
  const offsets = childOffsets(node);
  const { content } = node;
  let index = Math.min(childIndexAt(node, to - start), content.length - 1);
  let child = content[index];
  let childStart = start + (offsets[index] ?? 0);

  while (child !== undefined && childStart + nodeSize(child) > from) {
    if (childStart < to && child.kind === ContentNodeKind.Element) {
      const found = isTextblock(doc, child)
        ? childStart + child.size - 1
        : lastTextblockIn(doc, child, childStart + 1, from, to);

      if (found !== undefined) {
        return found;
      }
    }
    index -= 1;
    child = content[index];
    childStart = start + (offsets[index] ?? 0);
  }
  return undefined;
};

const firstTextblock = (doc: Doc, from: number, to: number): number | undefined =>
  firstTextblockIn(doc, doc.root, 0, from, to);

const lastTextblock = (doc: Doc, from: number, to: number): number | undefined =>
  lastTextblockIn(doc, doc.root, 0, from, to);

const textNear = (doc: Doc, pos: number, bias: -1 | 1): number | undefined =>
  bias > 0
    ? (firstTextblock(doc, pos, doc.size) ?? lastTextblock(doc, 0, pos))
    : (lastTextblock(doc, 0, pos) ?? firstTextblock(doc, pos, doc.size));

export const nearestCursor = (doc: Doc, pos: number, bias: -1 | 1 = 1): Selection => {
  const clamped = Math.max(0, Math.min(doc.size, pos));

  if (inText(doc, clamped)) {
    return textSelection(clamped);
  }
  const found = textNear(doc, clamped, bias);

  return found === undefined ? { kind: 'all' } : textSelection(found);
};

export const textPosition = (doc: Doc, pos: number, bias: -1 | 1): number | undefined => {
  const clamped = Math.max(0, Math.min(doc.size, pos));

  return inText(doc, clamped) ? clamped : textNear(doc, clamped, bias);
};

const gapRange = (doc: Doc, id: NodeId, side: GapSide): SelectionRange => {
  const block = blockAround(doc, id);
  const at = (side === GapSide.Start ? block?.from : block?.to) ?? 0;

  return { from: at, to: at };
};

const blocksRange = (doc: Doc, anchorId: NodeId, headId: NodeId): SelectionRange => {
  const anchor = blockAround(doc, anchorId) ?? { from: 0, to: 0 };
  const head = blockAround(doc, headId) ?? anchor;

  return { from: Math.min(anchor.from, head.from), to: Math.max(anchor.to, head.to) };
};

export const selectionRange = (doc: Doc, selection: Selection): SelectionRange => {
  switch (selection.kind) {
    case SelectionKind.Text:
      return {
        from: Math.min(selection.anchor, selection.head),
        to: Math.max(selection.anchor, selection.head),
      };
    case SelectionKind.Node:
      return blockAround(doc, selection.id) ?? { from: 0, to: 0 };
    case SelectionKind.Gap:
      return gapRange(doc, selection.id, selection.side);
    case SelectionKind.Block:
      return blocksRange(doc, selection.anchorId, selection.headId);
    case SelectionKind.Cell:
      return blockAround(doc, selection.tableId) ?? { from: 0, to: 0 };
    case SelectionKind.All:
      return { from: 0, to: doc.size };
  }
};

export const isCursor = (selection: Selection): boolean =>
  selection.kind === SelectionKind.Text && selection.anchor === selection.head;

const present = (doc: Doc, ...ids: readonly NodeId[]): boolean =>
  ids.every((id) => doc.byId(id) !== undefined);

export const validSelection = (doc: Doc, selection: Selection): Selection => {
  switch (selection.kind) {
    case SelectionKind.Text:
      return inText(doc, selection.head) && inText(doc, selection.anchor)
        ? selection
        : nearestCursor(doc, selection.head);
    case SelectionKind.Node:
    case SelectionKind.Gap:
      return present(doc, selection.id) ? selection : nearestCursor(doc, 0);
    case SelectionKind.Block:
      return present(doc, selection.anchorId, selection.headId) ? selection : nearestCursor(doc, 0);
    case SelectionKind.Cell:
      return present(doc, selection.tableId) ? selection : nearestCursor(doc, 0);
    case SelectionKind.All:
      return selection;
  }
};

export const followPosition = (
  pos: number,
  mapping: Mappable,
  before: Doc,
  after: Doc,
  assoc: Assoc = 1,
): number => {
  const mapped = mapping.mapResult(pos, assoc);

  if (!mapped.deleted) {
    return mapped.pos;
  }

  const { parent, parentOffset } = before.resolve(pos);
  const node = after.byId(parent.id);
  const start = after.positionOf(parent.id);

  return node === undefined ||
    start === undefined ||
    after.resolve(mapped.pos).parent.id === parent.id
    ? mapped.pos
    : start + 1 + Math.min(parentOffset, node.size - 2);
};

export const mapSelection = (
  selection: Selection,
  mapping: Mappable,
  before: Doc,
  after: Doc,
): Selection => {
  if (selection.kind === SelectionKind.Text) {
    return validSelection(
      after,
      textSelection(
        followPosition(selection.anchor, mapping, before, after),
        followPosition(selection.head, mapping, before, after),
      ),
    );
  }
  if (selection.kind === SelectionKind.All) {
    return selection;
  }
  const kept = validSelection(after, selection);

  return kept === selection
    ? selection
    : nearestCursor(after, mapping.map(selectionRange(before, selection).from));
};
