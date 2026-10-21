import type { CellAddress } from '../cell.types';
import { sameName, type LineChange } from '../formula/rewrite';
import { shiftIndex } from '../lines';

export const mapCell = (
  changes: readonly LineChange[],
  sheet: string,
  cell: CellAddress,
): CellAddress | undefined =>
  changes.reduce<CellAddress | undefined>((current, change) => {
    if (current === undefined || !sameName(change.sheet, sheet)) {
      return current;
    }

    const index = shiftIndex(change.axis === 'rows' ? current.row : current.col, change);

    if (index === undefined) {
      return undefined;
    }
    return change.axis === 'rows' ? { ...current, row: index } : { ...current, col: index };
  }, cell);
