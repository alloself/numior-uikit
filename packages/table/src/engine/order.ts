import { createRadixSortJob, type RadixLane } from './radix';
import { createSortJob } from './sort';
import type { SliceJob } from './slicer';
import type { RankedStore } from './engine.types';

export interface OrderKey {
  readonly store: RankedStore;
  readonly descending: boolean;
}

const RADIX_FROM = 1024;

const radixLaneOf = (key: OrderKey): RadixLane =>
  key.store.kind === 'number'
    ? { kind: 'float', keys: key.store.keys, nulls: key.store.nulls, descending: key.descending }
    : {
        kind: 'rank',
        keys: key.store.ranks,
        nulls: key.store.nulls,
        descending: key.descending,
        size: key.store.dictionary.length,
      };

const compareKey = (key: OrderKey, a: number, b: number): number => {
  const { nulls } = key.store;
  const nullA = nulls[a] === 1;
  const nullB = nulls[b] === 1;

  if (nullA || nullB) {
    return nullA === nullB ? 0 : nullA ? 1 : -1;
  }
  const keys = key.store.kind === 'number' ? key.store.keys : key.store.ranks;
  const keyA = keys[a] ?? 0;
  const keyB = keys[b] ?? 0;

  if (keyA === keyB) {
    return 0;
  }
  return keyA < keyB !== key.descending ? -1 : 1;
};

const compareKeys = (keys: readonly OrderKey[], a: number, b: number): number => {
  for (const key of keys) {
    const order = compareKey(key, a, b);

    if (order !== 0) {
      return order;
    }
  }
  return 0;
};

export const createOrderJob = (indices: Uint32Array, keys: readonly OrderKey[]): SliceJob =>
  indices.length >= RADIX_FROM
    ? createRadixSortJob(indices, keys.map(radixLaneOf))
    : createSortJob(indices, (a, b) => compareKeys(keys, a, b));
