import { MAX_COLS, MAX_ROWS } from './address';

export interface LineMove {
  readonly axis: 'rows' | 'cols';
  readonly at: number;
  readonly count: number;
}

export const limitOf = (axis: LineMove['axis']): number => (axis === 'rows' ? MAX_ROWS : MAX_COLS);

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
