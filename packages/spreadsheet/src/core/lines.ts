import { MAX_COLS, MAX_ROWS } from './address';
import { LineAxis, type CellRange } from './cell.types';

export interface LineMove {
  readonly axis: LineAxis;
  readonly at: number;
  readonly count: number;
}

export const limitOf = (axis: LineMove['axis']): number =>
  axis === LineAxis.Rows ? MAX_ROWS : MAX_COLS;

export const coversAxis = (range: CellRange, axis: LineMove['axis']): boolean =>
  axis === LineAxis.Rows
    ? range.top === 0 && range.bottom === MAX_ROWS - 1
    : range.left === 0 && range.right === MAX_COLS - 1;

export const shiftIndex = (index: number, change: LineMove): number | undefined => {
  if (index < change.at) {
    return index;
  }
  if (change.count > 0) {
    const moved = index + change.count;

    return moved < limitOf(change.axis) ? moved : undefined;
  }
  return index < change.at - change.count ? undefined : index + change.count;
};
