import { LineAxis, type CellAddress, type CellRange } from '../cell.types';
import { sameName, type LineChange } from '../formula/rewrite';
import { shiftRange } from '../layout/shift-ranges';
import { shiftIndex } from '../lines';

const cellOver = (cell: CellAddress, change: LineChange): CellAddress | undefined => {
  const rows = change.axis === LineAxis.Rows;
  const index = shiftIndex(rows ? cell.row : cell.col, change);

  if (index === undefined) {
    return undefined;
  }
  return rows ? { ...cell, row: index } : { ...cell, col: index };
};

const cellLeft = (cell: CellAddress, change: LineChange): CellAddress => {
  if (change.count > 0) {
    return cell;
  }
  return change.axis === LineAxis.Rows ? { ...cell, row: change.at } : { ...cell, col: change.at };
};

export const mapCell = (
  changes: readonly LineChange[],
  sheet: string,
  cell: CellAddress,
): CellAddress | undefined =>
  changes.reduce<CellAddress | undefined>(
    (current, change) =>
      current === undefined || !sameName(change.sheet, sheet) ? current : cellOver(current, change),
    cell,
  );

export const mapCellNear = (
  changes: readonly LineChange[],
  sheet: string,
  cell: CellAddress,
): CellAddress =>
  changes.reduce<CellAddress>(
    (current, change) =>
      sameName(change.sheet, sheet)
        ? (cellOver(current, change) ?? cellLeft(current, change))
        : current,
    cell,
  );

export const mapRange = (
  changes: readonly LineChange[],
  sheet: string,
  range: CellRange,
): CellRange | undefined =>
  changes.reduce<CellRange | undefined>(
    (current, change) =>
      current === undefined || !sameName(change.sheet, sheet)
        ? current
        : shiftRange(current, change),
    range,
  );
