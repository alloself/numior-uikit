import type { CellAddress, CellRange } from '../cell.types';
import { FormulaReferenceKind, type FormulaNode } from './formula.types';
import { referenceRange, storedReference, type LocatedReference } from './origin';
import { isSymbolic, mapReferences } from './references';
import { BROKEN, sameName } from './rewrite';

export interface BlockMove {
  readonly from: string;
  readonly area: CellRange;
  readonly to: string;
  readonly rows: number;
  readonly cols: number;
}

export interface FormulaSite {
  readonly sheet: string;
  readonly origin: CellAddress;
}

const within = (range: CellRange, area: CellRange): boolean =>
  range.top >= area.top &&
  range.bottom <= area.bottom &&
  range.left >= area.left &&
  range.right <= area.right;

const carried = (
  reference: LocatedReference,
  range: CellRange,
  move: BlockMove,
  home: string,
): boolean =>
  reference.book === undefined &&
  reference.kind !== FormulaReferenceKind.Columns &&
  reference.kind !== FormulaReferenceKind.Rows &&
  sameName(reference.sheet ?? home, move.from) &&
  within(range, move.area);

const named = (reference: LocatedReference, target: string, home: string): LocatedReference => {
  if (reference.book !== undefined) {
    return reference;
  }
  if (sameName(target, home)) {
    return reference.sheet === undefined ? reference : { ...reference, sheet: target };
  }
  return { ...reference, sheet: target };
};

export const followMove = (
  node: FormulaNode,
  move: BlockMove,
  before: FormulaSite,
  after: FormulaSite = before,
): FormulaNode =>
  mapReferences(node, (reference) => {
    if (isSymbolic(reference)) {
      return reference;
    }
    const stays = before === after;
    const range = referenceRange(reference, before.origin);

    if (range === undefined) {
      return stays ? reference : BROKEN;
    }
    if (carried(reference, range, move, before.sheet)) {
      return storedReference(
        named(reference, move.to, after.sheet),
        {
          top: range.top + move.rows,
          left: range.left + move.cols,
          bottom: range.bottom + move.rows,
          right: range.right + move.cols,
        },
        before.origin,
        after.origin,
      );
    }
    return stays
      ? reference
      : storedReference(
          named(reference, reference.sheet ?? before.sheet, after.sheet),
          range,
          before.origin,
          after.origin,
        );
  });
