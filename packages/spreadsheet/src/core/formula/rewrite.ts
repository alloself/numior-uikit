import { limitOf, shiftIndex, type LineMove } from '../lines';
import type { CellAddress, CellRange } from '../cell.types';
import type { FormulaNode } from './formula.types';
import {
  colOf,
  lineOf,
  referenceRange,
  rowOf,
  storedReference,
  type LocatedReference,
} from './origin';
import {
  formulaReferences,
  isSymbolic,
  mapReferences,
  onSheetNamed,
  type FormulaReference,
} from './references';

export interface LineChange extends LineMove {
  readonly sheet: string;
}

type Span = readonly [number, number];

export type StructuredReference = Extract<FormulaReference, { readonly kind: 'structured' }>;

export const BROKEN: FormulaNode = { kind: 'error', code: '#REF!' };

export const sameName = (left: string, right: string): boolean =>
  left.toLowerCase() === right.toLowerCase();

export const shiftSpan = ([first, last]: Span, change: LineChange): Span | undefined => {
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

const axisSpan = (range: CellRange, rows: boolean): Span =>
  rows ? [range.top, range.bottom] : [range.left, range.right];

const withSpan = (range: CellRange, rows: boolean, [first, last]: Span): CellRange =>
  rows ? { ...range, top: first, bottom: last } : { ...range, left: first, right: last };

const acrossAxis = (reference: LocatedReference, rows: boolean): boolean =>
  (reference.kind === 'columns' && rows) || (reference.kind === 'rows' && !rows);

const onChangedSheet = (
  reference: LocatedReference,
  change: LineChange,
  onSheet: boolean,
): boolean => {
  if (reference.book !== undefined) {
    return false;
  }
  return reference.sheet === undefined ? onSheet : sameName(reference.sheet, change.sheet);
};

const targetDelta = (line: number, change: LineChange): number | undefined => {
  if (line < change.at) {
    return 0;
  }
  if (change.count < 0) {
    return line < change.at - change.count ? undefined : change.count;
  }
  return line + change.count < limitOf(change.axis) ? change.count : undefined;
};

const keepsEnd = (
  absolute: boolean,
  line: number,
  change: LineChange,
  changed: boolean,
  originDelta: number,
): boolean => {
  const delta = changed ? targetDelta(line, change) : 0;

  return delta !== undefined && (absolute ? delta === 0 : delta === originDelta);
};

const keeps = (
  reference: LocatedReference,
  change: LineChange,
  changed: boolean,
  origin: CellAddress,
  originDelta: number,
): boolean => {
  const rows = change.axis === 'rows';

  if (acrossAxis(reference, rows)) {
    return true;
  }
  switch (reference.kind) {
    case 'cell':
    case 'spill':
      return rows
        ? keepsEnd(
            reference.ref.rowAbsolute,
            rowOf(reference.ref, origin),
            change,
            changed,
            originDelta,
          )
        : keepsEnd(
            reference.ref.colAbsolute,
            colOf(reference.ref, origin),
            change,
            changed,
            originDelta,
          );
    case 'range':
      return rows
        ? keepsEnd(
            reference.from.rowAbsolute,
            rowOf(reference.from, origin),
            change,
            changed,
            originDelta,
          ) &&
            keepsEnd(
              reference.to.rowAbsolute,
              rowOf(reference.to, origin),
              change,
              changed,
              originDelta,
            )
        : keepsEnd(
            reference.from.colAbsolute,
            colOf(reference.from, origin),
            change,
            changed,
            originDelta,
          ) &&
            keepsEnd(
              reference.to.colAbsolute,
              colOf(reference.to, origin),
              change,
              changed,
              originDelta,
            );
    default: {
      const base = rows ? origin.row : origin.col;

      return (
        keepsEnd(
          reference.from.absolute,
          lineOf(reference.from, base),
          change,
          changed,
          originDelta,
        ) &&
        keepsEnd(reference.to.absolute, lineOf(reference.to, base), change, changed, originDelta)
      );
    }
  }
};

const movedTarget = (
  reference: LocatedReference,
  range: CellRange,
  change: LineChange,
  changed: boolean,
): CellRange | undefined => {
  const rows = change.axis === 'rows';

  if (!changed || acrossAxis(reference, rows)) {
    return range;
  }

  const span = shiftSpan(axisSpan(range, rows), change);

  return span === undefined ? undefined : withSpan(range, rows, span);
};

const movedOrigin = (origin: CellAddress, change: LineChange): CellAddress | undefined => {
  const rows = change.axis === 'rows';
  const line = shiftIndex(rows ? origin.row : origin.col, change);

  if (line === undefined) {
    return undefined;
  }
  return rows ? { row: line, col: origin.col } : { row: origin.row, col: line };
};

const keepsNode = (
  node: FormulaNode,
  change: LineChange,
  onSheet: boolean,
  origin: CellAddress,
  originDelta: number,
): boolean => {
  switch (node.kind) {
    case 'cell':
    case 'range':
    case 'columns':
    case 'rows':
    case 'spill':
      return keeps(node, change, onChangedSheet(node, change, onSheet), origin, originDelta);
    case 'call':
      for (const arg of node.args) {
        if (!keepsNode(arg, change, onSheet, origin, originDelta)) {
          return false;
        }
      }
      return true;
    case 'unary':
    case 'percent':
      return keepsNode(node.operand, change, onSheet, origin, originDelta);
    case 'binary':
      return (
        keepsNode(node.left, change, onSheet, origin, originDelta) &&
        keepsNode(node.right, change, onSheet, origin, originDelta)
      );
    default:
      return true;
  }
};

export const shiftFormula = (
  node: FormulaNode,
  change: LineChange,
  onSheet: boolean,
  origin: CellAddress,
): FormulaNode => {
  const line = change.axis === 'rows' ? origin.row : origin.col;
  const originDelta = onSheet ? (shiftIndex(line, change) ?? line) - line : 0;

  if (keepsNode(node, change, onSheet, origin, originDelta)) {
    return node;
  }

  const after = (onSheet ? movedOrigin(origin, change) : origin) ?? origin;

  return mapReferences(node, (reference) => {
    if (isSymbolic(reference)) {
      return reference;
    }

    const changed = onChangedSheet(reference, change, onSheet);

    if (keeps(reference, change, changed, origin, originDelta)) {
      return reference;
    }

    const range = referenceRange(reference, origin);
    const moved = range === undefined ? undefined : movedTarget(reference, range, change, changed);

    return moved === undefined ? BROKEN : storedReference(reference, moved, origin, after);
  });
};

const meaningOf = (
  reference: FormulaReference,
  change: LineChange,
  onSheet: boolean,
  origin: CellAddress,
): boolean => {
  if (isSymbolic(reference) || !onChangedSheet(reference, change, onSheet)) {
    return false;
  }

  const rows = change.axis === 'rows';
  const range = referenceRange(reference, origin);

  if (range === undefined || acrossAxis(reference, rows)) {
    return false;
  }

  const before = axisSpan(range, rows);
  const after = shiftSpan(before, change);

  return after === undefined || after[1] - after[0] !== before[1] - before[0];
};

export const changesMeaning = (
  node: FormulaNode,
  change: LineChange,
  onSheet: boolean,
  origin: CellAddress,
): boolean =>
  formulaReferences(node).some((reference) => meaningOf(reference, change, onSheet, origin));

export const renameInFormula = (node: FormulaNode, from: string, to: string): FormulaNode =>
  mapReferences(node, (reference) =>
    onSheetNamed(reference, from) ? { ...reference, sheet: to } : reference,
  );

export const dropSheetFromFormula = (node: FormulaNode, name: string): FormulaNode =>
  mapReferences(node, (reference) => (onSheetNamed(reference, name) ? BROKEN : reference));

const ownedBy = (reference: FormulaReference, table: string): boolean =>
  reference.kind === 'structured'
    ? reference.table !== undefined && sameName(reference.table, table)
    : reference.kind === 'name' &&
      reference.sheet === undefined &&
      reference.book === undefined &&
      sameName(reference.name, table);

export const mapStructured = (
  node: FormulaNode,
  visit: (reference: StructuredReference) => FormulaNode,
): FormulaNode =>
  mapReferences(node, (reference) =>
    reference.kind === 'structured' ? visit(reference) : reference,
  );

export const renameTableInFormula = (node: FormulaNode, from: string, to: string): FormulaNode =>
  mapReferences(node, (reference) => {
    if (!ownedBy(reference, from)) {
      return reference;
    }
    if (reference.kind === 'structured') {
      return { ...reference, table: to };
    }
    return reference.kind === 'name' ? { ...reference, name: to } : reference;
  });

export const dropTableFromFormula = (node: FormulaNode, table: string): FormulaNode =>
  mapReferences(node, (reference) => (ownedBy(reference, table) ? BROKEN : reference));
