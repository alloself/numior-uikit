import { MAX_COLS, MAX_ROWS } from '../address';
import type { CellAddress, CellRange, CellRef } from '../cell.types';
import type { FormulaNode, LineRef } from './formula.types';
import { mapReferences, type FormulaReference } from './references';

export type LocatedReference = Exclude<FormulaReference, { readonly kind: 'name' }>;

export const ORIGIN: CellAddress = { row: 0, col: 0 };

const BROKEN: FormulaNode = { kind: 'error', code: '#REF!' };

export const rowOf = (ref: CellRef, origin: CellAddress): number =>
  ref.rowAbsolute ? ref.row : origin.row + ref.row;

export const colOf = (ref: CellRef, origin: CellAddress): number =>
  ref.colAbsolute ? ref.col : origin.col + ref.col;

export const lineOf = (line: LineRef, base: number): number =>
  line.absolute ? line.index : base + line.index;

const inRows = (row: number): boolean => row >= 0 && row < MAX_ROWS;

const inCols = (col: number): boolean => col >= 0 && col < MAX_COLS;

const cellRange = (from: CellRef, to: CellRef, origin: CellAddress): CellRange | undefined => {
  const rows = [rowOf(from, origin), rowOf(to, origin)];
  const cols = [colOf(from, origin), colOf(to, origin)];

  if (!rows.every(inRows) || !cols.every(inCols)) {
    return undefined;
  }
  return {
    top: Math.min(...rows),
    bottom: Math.max(...rows),
    left: Math.min(...cols),
    right: Math.max(...cols),
  };
};

const linesRange = (
  node: Extract<FormulaReference, { readonly kind: 'columns' | 'rows' }>,
  origin: CellAddress,
): CellRange | undefined => {
  const base = node.kind === 'columns' ? origin.col : origin.row;
  const first = lineOf(node.from, base);
  const last = lineOf(node.to, base);
  const inside = node.kind === 'columns' ? inCols : inRows;

  if (!inside(first) || !inside(last)) {
    return undefined;
  }

  const low = Math.min(first, last);
  const high = Math.max(first, last);

  return node.kind === 'columns'
    ? { top: 0, bottom: MAX_ROWS - 1, left: low, right: high }
    : { top: low, bottom: high, left: 0, right: MAX_COLS - 1 };
};

export const referenceRange = (
  node: LocatedReference,
  origin: CellAddress,
): CellRange | undefined => {
  switch (node.kind) {
    case 'range':
      return cellRange(node.from, node.to, origin);
    case 'columns':
    case 'rows':
      return linesRange(node, origin);
    default:
      return cellRange(node.ref, node.ref, origin);
  }
};

const storedRef = (ref: CellRef, row: number, col: number, origin: CellAddress): CellRef => ({
  ...ref,
  row: ref.rowAbsolute ? row : row - origin.row,
  col: ref.colAbsolute ? col : col - origin.col,
});

const storedLine = (line: LineRef, index: number, base: number): LineRef => ({
  ...line,
  index: line.absolute ? index : index - base,
});

const moveOrigin = (node: LocatedReference, from: CellAddress, to: CellAddress): FormulaNode => {
  switch (node.kind) {
    case 'cell':
    case 'spill':
      return {
        ...node,
        ref: storedRef(node.ref, rowOf(node.ref, from), colOf(node.ref, from), to),
      };
    case 'range':
      return {
        ...node,
        from: storedRef(node.from, rowOf(node.from, from), colOf(node.from, from), to),
        to: storedRef(node.to, rowOf(node.to, from), colOf(node.to, from), to),
      };
    default: {
      const before = node.kind === 'columns' ? from.col : from.row;
      const after = node.kind === 'columns' ? to.col : to.row;

      return {
        ...node,
        from: storedLine(node.from, lineOf(node.from, before), after),
        to: storedLine(node.to, lineOf(node.to, before), after),
      };
    }
  }
};

const atOrigin = (origin: CellAddress): boolean => origin.row === 0 && origin.col === 0;

export const relativeFormula = (node: FormulaNode, origin: CellAddress): FormulaNode =>
  atOrigin(origin)
    ? node
    : mapReferences(node, (reference) =>
        reference.kind === 'name' ? reference : moveOrigin(reference, ORIGIN, origin),
      );

export const absoluteFormula = (node: FormulaNode, origin: CellAddress): FormulaNode =>
  mapReferences(node, (reference) => {
    if (reference.kind === 'name') {
      return reference;
    }
    return referenceRange(reference, origin) === undefined
      ? BROKEN
      : moveOrigin(reference, origin, ORIGIN);
  });

type RangeReference = Extract<LocatedReference, { readonly kind: 'range' }>;

type LinesReference = Extract<LocatedReference, { readonly kind: 'columns' | 'rows' }>;

const storedRange = (
  node: RangeReference,
  range: CellRange,
  before: CellAddress,
  after: CellAddress,
): FormulaNode => {
  const top = rowOf(node.from, before) <= rowOf(node.to, before);
  const left = colOf(node.from, before) <= colOf(node.to, before);
  const fromRow = top ? range.top : range.bottom;
  const toRow = top ? range.bottom : range.top;
  const fromCol = left ? range.left : range.right;
  const toCol = left ? range.right : range.left;

  return {
    ...node,
    from: storedRef(node.from, fromRow, fromCol, after),
    to: storedRef(node.to, toRow, toCol, after),
  };
};

const storedLines = (
  node: LinesReference,
  range: CellRange,
  before: CellAddress,
  after: CellAddress,
): FormulaNode => {
  const columns = node.kind === 'columns';
  const base = columns ? before.col : before.row;
  const next = columns ? after.col : after.row;
  const low = columns ? range.left : range.top;
  const high = columns ? range.right : range.bottom;
  const ascending = lineOf(node.from, base) <= lineOf(node.to, base);

  return {
    ...node,
    from: storedLine(node.from, ascending ? low : high, next),
    to: storedLine(node.to, ascending ? high : low, next),
  };
};

export const storedReference = (
  node: LocatedReference,
  range: CellRange,
  before: CellAddress,
  after: CellAddress,
): FormulaNode => {
  switch (node.kind) {
    case 'cell':
    case 'spill':
      return { ...node, ref: storedRef(node.ref, range.top, range.left, after) };
    case 'range':
      return storedRange(node, range, before, after);
    default:
      return storedLines(node, range, before, after);
  }
};
