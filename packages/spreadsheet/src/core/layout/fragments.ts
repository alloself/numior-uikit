import { LineAxis, type CellAddress, type CellRange } from '../cell.types';
import type { FormulaNode } from '../formula/formula.types';
import { shiftFormula, type LineChange } from '../formula/rewrite';
import { limitOf, shiftIndex } from '../lines';
import {
  FragmentSlotKind,
  SlotPolicy,
  type Fragment,
  type FragmentPiece,
  type FragmentSlot,
  type PartXml,
  type SheetXml,
} from './fragments.types';
import { shiftRanges, survivorOf } from './shift-ranges';

interface Frame {
  readonly before: CellRange | undefined;
  readonly after: CellRange | undefined;
}

interface Shift {
  readonly change: LineChange;
  readonly own: boolean;
}

type FormulaMap = (ast: FormulaNode, anchor: CellAddress) => FormulaNode;

const ORIGIN: CellAddress = { row: 0, col: 0 };

const cellRange = (cell: CellAddress): CellRange => ({
  top: cell.row,
  left: cell.col,
  bottom: cell.row,
  right: cell.col,
});

export const isSlot = (piece: FragmentPiece): piece is FragmentSlot =>
  typeof piece !== 'string' && 'kind' in piece;

const primaryOf = (fragment: Fragment): CellRange | undefined => {
  for (const piece of fragment.pieces) {
    if (isSlot(piece) && piece.kind === FragmentSlotKind.Cell) {
      return cellRange(piece.cell);
    }
    if (isSlot(piece) && piece.kind === FragmentSlotKind.Ranges && piece.ranges[0] !== undefined) {
      return piece.ranges[0];
    }
  }
  return undefined;
};

export const anchorOf = (fragment: Fragment): CellAddress => {
  const primary = primaryOf(fragment);

  return primary === undefined ? ORIGIN : { row: primary.top, col: primary.left };
};

const clampOf = (change: LineChange): number => Math.min(change.at, limitOf(change.axis) - 1);

const movedCell = (cell: CellAddress, change: LineChange): CellAddress | undefined => {
  const rows = change.axis === LineAxis.Rows;
  const line = shiftIndex(rows ? cell.row : cell.col, change);

  if (line === undefined) {
    return undefined;
  }
  return rows ? { ...cell, row: line } : { ...cell, col: line };
};

const clampedCell = (cell: CellAddress, change: LineChange): CellAddress =>
  change.axis === LineAxis.Rows
    ? { ...cell, row: clampOf(change) }
    : { ...cell, col: clampOf(change) };

const sameRanges = (left: readonly CellRange[], right: readonly CellRange[]): boolean =>
  left.length === right.length &&
  left.every(
    (range, index) =>
      range.top === right[index]?.top &&
      range.left === right[index]?.left &&
      range.bottom === right[index]?.bottom &&
      range.right === right[index]?.right,
  );

export const splitBoundary = (count: number, change: LineChange): number => {
  if (change.count > 0) {
    return change.at < count ? Math.min(count + change.count, limitOf(change.axis)) : count;
  }

  const end = change.at - change.count;

  return count - Math.max(0, Math.min(count, end) - change.at);
};

const shiftCellSlot = (
  slot: Extract<FragmentSlot, { readonly kind: typeof FragmentSlotKind.Cell }>,
  change: LineChange,
): FragmentSlot | undefined => {
  const moved = movedCell(slot.cell, change);

  if (moved === undefined) {
    return slot.policy === SlotPolicy.Drop
      ? undefined
      : { ...slot, cell: clampedCell(slot.cell, change) };
  }
  return moved.row === slot.cell.row && moved.col === slot.cell.col
    ? slot
    : { ...slot, cell: moved };
};

const shiftRangesSlot = (
  slot: Extract<FragmentSlot, { readonly kind: typeof FragmentSlotKind.Ranges }>,
  change: LineChange,
): FragmentSlot | undefined => {
  const ranges = shiftRanges(slot.ranges, change);
  const first = slot.ranges[0];

  if (ranges.length === 0) {
    return slot.policy === SlotPolicy.Drop || first === undefined
      ? undefined
      : {
          ...slot,
          ranges: [cellRange(clampedCell({ row: first.top, col: first.left }, change))],
        };
  }
  return sameRanges(ranges, slot.ranges) ? slot : { ...slot, ranges };
};

const shiftLineSlot = (
  slot: Extract<FragmentSlot, { readonly kind: typeof FragmentSlotKind.Line }>,
  change: LineChange,
): FragmentSlot | undefined => {
  const line = shiftIndex(slot.line, change);

  if (line === undefined) {
    return slot.policy === SlotPolicy.Drop ? undefined : { ...slot, line: clampOf(change) };
  }
  return line === slot.line ? slot : { ...slot, line };
};

const shiftOffset = (
  slot: Extract<FragmentSlot, { readonly kind: typeof FragmentSlotKind.Offset }>,
  change: LineChange,
  parent: Frame,
): FragmentSlot | undefined => {
  if (parent.before === undefined || parent.after === undefined) {
    return slot;
  }

  const column = shiftIndex(parent.before.left + slot.offset, change);

  if (column === undefined) {
    return undefined;
  }

  const offset = column - parent.after.left;

  return offset === slot.offset ? slot : { ...slot, offset };
};

const shiftFormulaSlot = (
  slot: Extract<FragmentSlot, { readonly kind: typeof FragmentSlotKind.Formula }>,
  shift: Shift,
  frame: Frame,
): FragmentSlot => {
  const before = frame.before ?? cellRange(ORIGIN);
  const after = frame.after ?? before;

  const origin = shift.own
    ? survivorOf({ row: after.top, col: after.left }, shift.change)
    : { row: before.top, col: before.left };

  const ast = shiftFormula(slot.ast, shift.change, shift.own, origin);

  return ast === slot.ast ? slot : { ...slot, ast };
};

const followed = (
  slot: Extract<FragmentSlot, { readonly kind: typeof FragmentSlotKind.Line }>,
  change: LineChange,
  delta: number,
): FragmentSlot => {
  const line = Math.min(Math.max(slot.line + delta, 0), limitOf(change.axis) - 1);

  return line === slot.line ? slot : { ...slot, line };
};

const shiftLine = (
  slot: Extract<FragmentSlot, { readonly kind: typeof FragmentSlotKind.Line }>,
  change: LineChange,
  deltas: Map<LineAxis, number>,
): FragmentSlot | undefined => {
  const delta = deltas.get(slot.axis);

  if (slot.policy === SlotPolicy.Fixed) {
    return slot;
  }
  if (slot.policy === SlotPolicy.Follow && delta !== undefined) {
    return followed(slot, change, delta);
  }

  const moved = shiftLineSlot(slot, change);

  if (moved?.kind === FragmentSlotKind.Line && slot.policy !== SlotPolicy.Follow) {
    deltas.set(slot.axis, moved.line - slot.line);
  }
  return moved;
};

const shiftSplit = (
  slot: Extract<FragmentSlot, { readonly kind: typeof FragmentSlotKind.Split }>,
  change: LineChange,
): FragmentSlot => {
  const count = slot.axis === change.axis ? splitBoundary(slot.count, change) : slot.count;

  return count === slot.count ? slot : { ...slot, count };
};

const shiftSlot = (
  slot: FragmentSlot,
  shift: Shift,
  frames: { readonly own: Frame; readonly parent: Frame; readonly deltas: Map<LineAxis, number> },
): FragmentSlot | undefined => {
  const { change } = shift;

  if (slot.kind === FragmentSlotKind.Formula) {
    return shiftFormulaSlot(slot, shift, frames.own);
  }
  if (!shift.own) {
    return slot;
  }
  switch (slot.kind) {
    case FragmentSlotKind.Cell:
      return shiftCellSlot(slot, change);
    case FragmentSlotKind.Ranges:
      return shiftRangesSlot(slot, change);
    case FragmentSlotKind.Line:
      return slot.axis === change.axis ? shiftLine(slot, change, frames.deltas) : slot;
    case FragmentSlotKind.Split:
      return shiftSplit(slot, change);
    case FragmentSlotKind.Offset:
      return change.axis === LineAxis.Cols ? shiftOffset(slot, change, frames.parent) : slot;
    case FragmentSlotKind.Measure:
    case FragmentSlotKind.Count:
      return slot;
  }
};

const frameOf = (fragment: Fragment, shift: Shift): Frame => {
  const before = primaryOf(fragment);

  if (before === undefined || !shift.own) {
    return { before, after: before };
  }
  return { before, after: shiftRanges([before], shift.change)[0] };
};

export const childCount = (pieces: readonly FragmentPiece[]): number =>
  pieces.reduce((count, piece) => count + (typeof piece !== 'string' && !isSlot(piece) ? 1 : 0), 0);

const shiftPieces = (
  fragment: Fragment,
  shift: Shift,
  parent: Frame,
): FragmentPiece[] | undefined => {
  const own = frameOf(fragment, shift);
  const deltas = new Map<LineAxis, number>();
  const pieces: FragmentPiece[] = [];

  for (const piece of fragment.pieces) {
    if (typeof piece === 'string') {
      pieces.push(piece);
    } else if (isSlot(piece)) {
      const moved = shiftSlot(piece, shift, { own, parent, deltas });

      if (moved === undefined) {
        return undefined;
      }
      pieces.push(moved);
    } else {
      const moved = shiftNested(piece, shift, own);

      if (moved !== undefined) {
        pieces.push(moved);
      }
    }
  }
  return pieces;
};

const shiftNested = (fragment: Fragment, shift: Shift, parent: Frame): Fragment | undefined => {
  const pieces = shiftPieces(fragment, shift, parent);

  if (pieces === undefined || (fragment.group && childCount(pieces) === 0)) {
    return undefined;
  }
  return pieces.every((piece, index) => piece === fragment.pieces[index]) &&
    pieces.length === fragment.pieces.length
    ? fragment
    : { ...fragment, pieces };
};

const NO_FRAME: Frame = { before: undefined, after: undefined };

const shiftRoot = (fragment: Fragment, shift: Shift): Fragment =>
  shiftNested(fragment, shift, NO_FRAME) ?? fragment;

export const shiftSheetXml = (xml: SheetXml, change: LineChange, own: boolean): SheetXml => {
  const head = shiftRoot(xml.head, { change, own });
  const tail = shiftRoot(xml.tail, { change, own });

  return head === xml.head && tail === xml.tail ? xml : { ...xml, head, tail };
};

const mapPieces = (fragment: Fragment, map: FormulaMap): Fragment => {
  const anchor = anchorOf(fragment);

  const pieces = fragment.pieces.map((piece): FragmentPiece => {
    if (typeof piece === 'string') {
      return piece;
    }
    if (!isSlot(piece)) {
      return mapPieces(piece, map);
    }
    if (piece.kind !== FragmentSlotKind.Formula) {
      return piece;
    }

    const ast = map(piece.ast, anchor);

    return ast === piece.ast ? piece : { ...piece, ast };
  });

  return pieces.every((piece, index) => piece === fragment.pieces[index])
    ? fragment
    : { ...fragment, pieces };
};

export const mapSheetXmlFormulas = (xml: SheetXml, map: FormulaMap): SheetXml => {
  const head = mapPieces(xml.head, map);
  const tail = mapPieces(xml.tail, map);

  return head === xml.head && tail === xml.tail ? xml : { ...xml, head, tail };
};

const sameParts = (left: readonly PartXml[], right: readonly PartXml[]): boolean =>
  left.every((part, index) => part === right[index]);

export const shiftParts = (
  parts: readonly PartXml[],
  change: LineChange,
  own: boolean,
): readonly PartXml[] => {
  const moved = parts.map((part) => {
    const root = shiftRoot(part.root, { change, own });

    return root === part.root ? part : { ...part, root };
  });

  return sameParts(moved, parts) ? parts : moved;
};

export const mapPartFormulas = (parts: readonly PartXml[], map: FormulaMap): readonly PartXml[] => {
  const mapped = parts.map((part) => {
    const root = mapPieces(part.root, map);

    return root === part.root ? part : { ...part, root };
  });

  return sameParts(mapped, parts) ? parts : mapped;
};
