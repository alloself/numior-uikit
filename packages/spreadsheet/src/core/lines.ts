import { MAX_COLS, MAX_ROWS } from './address';
import { LineAxis } from './cell.types';

export interface LineMove {
  readonly axis: LineAxis;
  readonly at: number;
  readonly count: number;
}

export const limitOf = (axis: LineMove['axis']): number =>
  axis === LineAxis.Rows ? MAX_ROWS : MAX_COLS;

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
