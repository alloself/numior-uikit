import {
  createNumberRankJob,
  createRankingSortJob,
  createThenJob,
  numberRanksOf,
} from './number-ranks';
import { createRadixSortJob, type RadixLane } from './radix';
import { createSortJob } from './sort';
import type { SliceJob } from './slicer';
import type { RankedStore } from './engine.types';

export interface OrderKey {
  readonly store: RankedStore;
  readonly descending: boolean;
}

const RADIX_FROM = 1024;

const radixLaneOf = (key: OrderKey): RadixLane => {
  const { store, descending } = key;

  if (store.kind !== 'number') {
    return {
      kind: 'rank',
      keys: store.ranks,
      nulls: store.nulls,
      descending,
      size: store.dictionary.length,
    };
  }

  const ranked = numberRanksOf(store);

  return ranked === undefined
    ? { kind: 'float', keys: store.keys, nulls: store.nulls, descending }
    : { kind: 'rank', keys: ranked.ranks, nulls: store.nulls, descending, size: ranked.size };
};

const radixJob = (indices: Uint32Array, keys: readonly OrderKey[]): SliceJob => {
  const [only] = keys;

  if (
    keys.length === 1 &&
    only?.store.kind === 'number' &&
    numberRanksOf(only.store) === undefined
  ) {
    return createRankingSortJob(indices, only.store, only.descending);
  }

  const sorting = (): SliceJob => createRadixSortJob(indices, keys.map(radixLaneOf));

  return keys.reduceRight<() => SliceJob>((next, key) => {
    const { store } = key;

    return store.kind === 'number' && numberRanksOf(store) === undefined
      ? () => createThenJob(createNumberRankJob(store), next)
      : next;
  }, sorting)();
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
    ? radixJob(indices, keys)
    : createSortJob(indices, (a, b) => compareKeys(keys, a, b));
