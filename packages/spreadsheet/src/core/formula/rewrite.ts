import { MAX_COLS, MAX_ROWS } from '../address';
import type { CellRef } from '../cell.types';
import type { FormulaNode, LineRef } from './formula.types';
import type { FormulaReference } from './references';

export interface LineChange {
  readonly sheet: string;
  readonly axis: 'rows' | 'cols';
  readonly at: number;
  readonly count: number;
}

type Located = Exclude<FormulaReference, { readonly kind: 'name' }>;

type Span = readonly [number, number];

const BROKEN: FormulaNode = { kind: 'error', code: '#REF!' };

export const sameName = (left: string, right: string): boolean =>
  left.toLowerCase() === right.toLowerCase();

const mapNodes = (
  nodes: readonly FormulaNode[],
  visit: (node: FormulaNode) => FormulaNode,
): readonly FormulaNode[] => {
  const mapped = nodes.map(visit);

  return mapped.every((node, index) => node === nodes[index]) ? nodes : mapped;
};

const mapReferences = (
  node: FormulaNode,
  visit: (reference: FormulaReference) => FormulaNode,
): FormulaNode => {
  const walk = (current: FormulaNode): FormulaNode => {
    switch (current.kind) {
      case 'cell':
      case 'range':
      case 'columns':
      case 'rows':
      case 'spill':
      case 'name':
        return visit(current);
      case 'call': {
        const args = mapNodes(current.args, walk);

        return args === current.args ? current : { ...current, args };
      }
      case 'unary':
      case 'percent': {
        const operand = walk(current.operand);

        return operand === current.operand ? current : { ...current, operand };
      }
      case 'binary': {
        const left = walk(current.left);
        const right = walk(current.right);

        return left === current.left && right === current.right
          ? current
          : { ...current, left, right };
      }
      default:
        return current;
    }
  };

  return walk(node);
};

const limitOf = (axis: LineChange['axis']): number => (axis === 'rows' ? MAX_ROWS : MAX_COLS);

export const shiftIndex = (index: number, change: LineChange): number | undefined => {
  if (index < change.at) {
    return index;
  }
  if (change.count > 0) {
    const moved = index + change.count;

    return moved < limitOf(change.axis) ? moved : undefined;
  }
  return index < change.at - change.count ? undefined : index + change.count;
};

const shiftSpan = ([first, last]: Span, change: LineChange): Span | undefined => {
  if (change.count > 0) {
    const top = shiftIndex(first, change);

    const bottom = Math.min(
      shiftIndex(last, change) ?? limitOf(change.axis) - 1,
      limitOf(change.axis) - 1,
    );

    return top === undefined ? undefined : [top, bottom];
  }

  const end = change.at - change.count - 1;

  if (first >= change.at && last <= end) {
    return undefined;
  }

  const top = first > end ? first + change.count : Math.min(first, change.at);
  const bottom = last > end ? last + change.count : Math.min(last, change.at - 1);

  return [top, bottom];
};

const movedRef = (ref: CellRef, change: LineChange): CellRef | undefined => {
  const index = shiftIndex(change.axis === 'rows' ? ref.row : ref.col, change);

  if (index === undefined) {
    return undefined;
  }
  return change.axis === 'rows' ? { ...ref, row: index } : { ...ref, col: index };
};

const ordered = (left: number, right: number): Span => [
  Math.min(left, right),
  Math.max(left, right),
];

const placed = (span: Span, ascending: boolean): Span => (ascending ? span : [span[1], span[0]]);

const shiftRange = (
  node: Extract<FormulaReference, { readonly kind: 'range' }>,
  change: LineChange,
): FormulaNode => {
  const rows = change.axis === 'rows';
  const from = rows ? node.from.row : node.from.col;
  const to = rows ? node.to.row : node.to.col;
  const span = shiftSpan(ordered(from, to), change);

  if (span === undefined) {
    return BROKEN;
  }

  const [first, last] = placed(span, from <= to);

  return rows
    ? { ...node, from: { ...node.from, row: first }, to: { ...node.to, row: last } }
    : { ...node, from: { ...node.from, col: first }, to: { ...node.to, col: last } };
};

const shiftLines = (
  node: Extract<FormulaReference, { readonly kind: 'columns' | 'rows' }>,
  change: LineChange,
): FormulaNode => {
  const span = shiftSpan(ordered(node.from.index, node.to.index), change);

  if (span === undefined) {
    return BROKEN;
  }

  const [first, last] = placed(span, node.from.index <= node.to.index);
  const from: LineRef = { ...node.from, index: first };
  const to: LineRef = { ...node.to, index: last };

  return { ...node, from, to };
};

const shiftLocated = (node: Located, change: LineChange): FormulaNode => {
  switch (node.kind) {
    case 'cell':
    case 'spill': {
      const ref = movedRef(node.ref, change);

      return ref === undefined ? BROKEN : { ...node, ref };
    }
    case 'range':
      return shiftRange(node, change);
    case 'columns':
      return change.axis === 'cols' ? shiftLines(node, change) : node;
    case 'rows':
      return change.axis === 'rows' ? shiftLines(node, change) : node;
  }
};

const unchanged = (node: Located, change: LineChange): boolean => {
  switch (node.kind) {
    case 'cell':
    case 'spill':
      return (change.axis === 'rows' ? node.ref.row : node.ref.col) < change.at;
    case 'range':
      return change.axis === 'rows'
        ? Math.max(node.from.row, node.to.row) < change.at
        : Math.max(node.from.col, node.to.col) < change.at;
    default:
      return Math.max(node.from.index, node.to.index) < change.at;
  }
};

export const shiftFormula = (node: FormulaNode, change: LineChange, home: string): FormulaNode =>
  mapReferences(node, (reference) => {
    if (reference.kind === 'name' || !sameName(reference.sheet ?? home, change.sheet)) {
      return reference;
    }
    return unchanged(reference, change) ? reference : shiftLocated(reference, change);
  });

export const renameInFormula = (node: FormulaNode, from: string, to: string): FormulaNode =>
  mapReferences(node, (reference) =>
    reference.kind !== 'name' && reference.sheet !== undefined && sameName(reference.sheet, from)
      ? { ...reference, sheet: to }
      : reference,
  );

export const dropSheetFromFormula = (node: FormulaNode, name: string): FormulaNode =>
  mapReferences(node, (reference) =>
    reference.kind !== 'name' && reference.sheet !== undefined && sameName(reference.sheet, name)
      ? BROKEN
      : reference,
  );
