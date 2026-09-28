import { describe, expect, it } from 'vitest';
import { createStoreJob, type ColumnStore, type GridEngineColumn } from '../src/engine';

const collator = new Intl.Collator('ru', { numeric: true });

const build = <T>(column: GridEngineColumn<T>, rows: readonly T[]): ColumnStore => {
  const job = createStoreJob(column, rows, collator);

  while (!job.work(performance.now() - 1)) {
    expect(job.done()).toBeLessThanOrEqual(job.total());
  }
  return job.result();
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
    const store = stringStore(
      build({ kind: 'string', key: 's', value: (row: string | null) => row }, [
        'вишня',
        'абрикос',
        'Банан',
        'абрикос',
        null,
        'item 10',
        'item 2',
      ]),
    );

    expect(store.dictionary).toEqual(['вишня', 'абрикос', 'Банан', 'item 10', 'item 2']);
    expect(Array.from(store.nulls)).toEqual([0, 0, 0, 0, 1, 0, 0]);
    const rankOf = (index: number): number => store.ranks[index] ?? -1;
    expect(rankOf(1)).toBe(rankOf(3));
    expect(rankOf(1)).toBeLessThan(rankOf(2));
    expect(rankOf(2)).toBeLessThan(rankOf(0));
    expect(rankOf(6)).toBeLessThan(rankOf(5));
    expect(rankOf(6)).toBeGreaterThan(rankOf(0));
  });
});
