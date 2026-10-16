import { describe, expect, it } from 'vite-plus/test';
import {
  createRankJob,
  createStoreJob,
  type ColumnStore,
  type TableEngineColumn,
  type StoreJob,
  type StoreNeed,
} from '../src/engine';

const collator = new Intl.Collator('ru', { numeric: true });

const finish = (job: StoreJob): ColumnStore => {
  while (!job.work(performance.now() - 1)) {
    expect(job.done()).toBeLessThanOrEqual(job.total());
  }
  return job.result();
};

const build = <T>(
  column: TableEngineColumn<T>,
  rows: readonly T[],
  need: StoreNeed = 'ranks',
): ColumnStore => finish(createStoreJob(column, rows, collator, need));

const FRUITS = ['вишня', 'абрикос', 'Банан', 'абрикос', null, 'item 10', 'item 2'];

const fruit: TableEngineColumn<string | null> = {
  kind: 'string',
  key: 's',
  value: (row) => row,
};

const numberStore = (store: ColumnStore) => {
  if (store.kind !== 'number') {
    throw new Error('Expected a number store');
  }
  return store;
};

const stringStore = (store: ColumnStore) => {
  if (store.kind !== 'string') {
    throw new Error('Expected a string store');
  }
  return store;
};

describe('createStoreJob', () => {
  it('keeps numbers, marks null and NaN as missing and maps booleans and dates to numbers', () => {
    const numbers = numberStore(
      build({ kind: 'number', key: 'n', value: (row: number | null) => row }, [3, null, NaN, -1]),
    );

    expect(Array.from(numbers.keys)).toEqual([3, 0, 0, -1]);
    expect(Array.from(numbers.nulls)).toEqual([0, 1, 1, 0]);

    const flags = numberStore(
      build({ kind: 'boolean', key: 'b', value: (row: boolean | null) => row }, [
        true,
        false,
        null,
      ]),
    );

    expect(Array.from(flags.keys)).toEqual([1, 0, 0]);
    expect(Array.from(flags.nulls)).toEqual([0, 0, 1]);

    const dates = numberStore(
      build({ kind: 'date', key: 'd', value: (row: Date | number | null) => row }, [
        new Date(86_400_000),
        42,
        null,
      ]),
    );

    expect(Array.from(dates.keys)).toEqual([86_400_000, 42, 0]);
    expect(Array.from(dates.nulls)).toEqual([0, 0, 1]);
  });

  it('ranks strings through the collator with a shared dictionary and numeric awareness', () => {
    const store = stringStore(build(fruit, FRUITS));

    expect(store.dictionary).toEqual(['вишня', 'абрикос', 'Банан', 'item 10', 'item 2']);
    expect(Array.from(store.nulls)).toEqual([0, 0, 0, 0, 1, 0, 0]);
    const rankOf = (index: number): number => store.ranks[index] ?? -1;
    expect(rankOf(1)).toBe(rankOf(3));
    expect(rankOf(1)).toBeLessThan(rankOf(2));
    expect(rankOf(2)).toBeLessThan(rankOf(0));
    expect(rankOf(6)).toBeLessThan(rankOf(5));
    expect(rankOf(6)).toBeGreaterThan(rankOf(0));
  });

  it('codes strings without ranking them and ranks the same codes later on demand', () => {
    const coded = build(fruit, FRUITS, 'codes');

    if (coded.kind !== 'codes') {
      throw new Error('Expected a coded store');
    }
    expect(coded.dictionary).toEqual(['вишня', 'абрикос', 'Банан', 'item 10', 'item 2']);
    expect(Array.from(coded.codes)).toEqual([0, 1, 2, 1, 0, 3, 4]);
    const ranked = stringStore(finish(createRankJob(coded, collator)));

    expect(ranked.codes).toBe(coded.codes);
    expect(ranked.dictionary).toBe(coded.dictionary);
    expect(Array.from(ranked.sortedCodes)).toEqual([1, 2, 0, 4, 3]);
    expect(Array.from(ranked.ranks)).toEqual([2, 0, 1, 0, 2, 4, 3]);
  });
});
