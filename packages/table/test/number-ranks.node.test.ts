import { describe, expect, it } from 'vite-plus/test';
import { createSortJob, identityIndices, type SliceJob } from '../src/engine';
import { createNumberRankJob, hasPendingRanks, numberRanksOf } from '../src/engine/number-ranks';
import { createOrderJob, type OrderKey } from '../src/engine/order';
import { mulberry32 } from '../bench/dataset';

const LENGTH = 6_000;

const finish = (job: SliceJob): void => {
  while (!job.work(performance.now() - 1)) {
    expect(job.done()).toBeLessThanOrEqual(job.total());
  }
};

const numbers = () => {
  const random = mulberry32(23);

  return {
    kind: 'number' as const,
    keys: Float64Array.from({ length: LENGTH }, () => Math.round(random() * 400) / 4 - 30),
    nulls: Uint8Array.from({ length: LENGTH }, () => (random() < 0.05 ? 1 : 0)),
  };
};

const texts = () => {
  const random = mulberry32(29);
  const dictionary = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

  return {
    kind: 'string' as const,
    codes: Uint32Array.from({ length: LENGTH }, () => Math.floor(random() * dictionary.length)),
    ranks: Uint32Array.from({ length: LENGTH }, () => Math.floor(random() * dictionary.length)),
    sortedCodes: Uint32Array.from(dictionary.keys()),
    nulls: Uint8Array.from({ length: LENGTH }, () => (random() < 0.02 ? 1 : 0)),
    dictionary,
  };
};

const valueOf = (key: OrderKey, row: number): number => {
  if (key.store.nulls[row] === 1) {
    return Number.POSITIVE_INFINITY;
  }

  const value = key.store.kind === 'number' ? key.store.keys[row] : key.store.ranks[row];

  return key.descending ? -(value ?? 0) : (value ?? 0);
};

const expected = (indices: Uint32Array, keys: readonly OrderKey[]): number[] => {
  const copy = indices.slice();

  finish(
    createSortJob(copy, (a, b) => {
      for (const key of keys) {
        const left = valueOf(key, a);
        const right = valueOf(key, b);

        if (left !== right) {
          return left < right ? -1 : 1;
        }
      }
      return 0;
    }),
  );

  return Array.from(copy);
};

const ordered = (indices: Uint32Array, keys: readonly OrderKey[]): number[] => {
  const copy = indices.slice();

  finish(createOrderJob(copy, keys));
  return Array.from(copy);
};

describe('number ranks', () => {
  it('sorts a number column, keeps its sorted keys and ranks them without sorting again', () => {
    const store = numbers();
    const all = identityIndices(LENGTH);
    const half = all.filter((row) => row % 2 === 0);

    expect(ordered(half, [{ store, descending: false }])).toEqual(
      expected(half, [{ store, descending: false }]),
    );

    expect(hasPendingRanks(store)).toBe(false);

    expect(ordered(all, [{ store, descending: true }])).toEqual(
      expected(all, [{ store, descending: true }]),
    );

    expect(numberRanksOf(store)).toBeUndefined();
    expect(hasPendingRanks(store)).toBe(true);

    finish(createNumberRankJob(store));

    expect(hasPendingRanks(store)).toBe(false);

    expect(numberRanksOf(store)?.size).toBe(
      new Set(store.keys.filter((_, row) => store.nulls[row] !== 1)).size,
    );

    expect(ordered(half, [{ store, descending: false }])).toEqual(
      expected(half, [{ store, descending: false }]),
    );
  });

  it('ranks numbers first when they sort after other keys', () => {
    const store = numbers();
    const words = texts();

    const keys: OrderKey[] = [
      { store: words, descending: true },
      { store, descending: false },
    ];

    const all = identityIndices(LENGTH);

    expect(ordered(all, keys)).toEqual(expected(all, keys));
    expect(numberRanksOf(store)).toBeDefined();
    expect(ordered(all, keys.toReversed())).toEqual(expected(all, keys.toReversed()));
  });
});
