import type { TableEngine } from '../engine';
import type { TableDetailSpot } from './table.types';

export const NO_SPOTS: readonly TableDetailSpot[] = [];
export const NO_DETAILS: readonly number[] = [];

export const detailSpotsOf = <T>(
  engine: TableEngine<T>,
  positions: readonly number[],
  start: number,
  count: number,
): readonly TableDetailSpot[] =>
  positions.flatMap((position) => {
    const inside = position >= start && position < start + count;
    const node = inside ? engine.nodeAt(position) : undefined;

    return node?.kind === 'detail' ? [{ position: position - start, id: node.id }] : [];
  });

export const sameSpots = (a: readonly TableDetailSpot[], b: readonly TableDetailSpot[]): boolean =>
  a.length === b.length &&
  a.every((spot, index) => spot.position === b[index]?.position && spot.id === b[index]?.id);

export const detailsBefore = (spots: readonly TableDetailSpot[], position: number): number => {
  let low = 0;
  let high = spots.length;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);

    if ((spots[middle]?.position ?? 0) < position) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
};
