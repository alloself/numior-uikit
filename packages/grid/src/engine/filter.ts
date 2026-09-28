import { CHECK_INTERVAL, type SliceJob } from './slicer';
import type { ColumnStore, GridEngineColumn, GridFilter, GridFilterValue } from './engine.types';

export type RowTest = (index: number) => boolean;

export interface FilterJob extends SliceJob {
  pass(): Uint8Array;
}

type TextMatch = (candidate: string) => boolean;

const textMatcher = (filter: Extract<GridFilter, { kind: 'text' }>): TextMatch => {
  const needle = filter.value.toLocaleLowerCase();

  switch (filter.op) {
    case 'contains':
      return (candidate) => candidate.toLocaleLowerCase().includes(needle);
    case 'equals':
      return (candidate) => candidate.toLocaleLowerCase() === needle;
    case 'starts':
      return (candidate) => candidate.toLocaleLowerCase().startsWith(needle);
    case 'empty':
      return (candidate) => candidate === '';
  }
};

const dictionaryMap = (dictionary: readonly string[], match: TextMatch): Uint8Array => {
  const map = new Uint8Array(dictionary.length);

  for (let code = 0; code < dictionary.length; code += 1) {
    map[code] = match(dictionary[code] ?? '') ? 1 : 0;
  }
  return map;
};

const stringTest = (
  store: Extract<ColumnStore, { kind: 'string' }>,
  match: TextMatch,
  nullPasses: boolean,
): RowTest => {
  const map = dictionaryMap(store.dictionary, match);
  return (index) => (store.nulls[index] === 1 ? nullPasses : map[store.codes[index] ?? 0] === 1);
};

const rangeTest = (
  store: Extract<ColumnStore, { kind: 'number' }>,
  low: number | undefined,
  high: number | undefined,
): RowTest => {
  if (low === undefined && high === undefined) {
    return () => true;
  }
  const min = low ?? Number.NEGATIVE_INFINITY;
  const max = high ?? Number.POSITIVE_INFINITY;

  return (index) => {
    if (store.nulls[index] === 1) {
      return false;
    }
    const key = store.keys[index] ?? 0;
    return key >= min && key <= max;
  };
};

const numericValue = (value: GridFilterValue): number | null => {
  switch (typeof value) {
    case 'number':
      return value;
    case 'boolean':
      return value ? 1 : 0;
    case 'string':
      return null;
    default:
      return null;
  }
};

const setTest = (store: ColumnStore, values: readonly GridFilterValue[]): RowTest => {
  const nullPasses = values.includes(null);

  if (store.kind === 'string') {
    const codes = new Map(store.dictionary.map((entry, code) => [entry, code]));
    const wanted = new Set<number>();

    for (const value of values) {
      const code = typeof value === 'string' ? codes.get(value) : undefined;

      if (code !== undefined) {
        wanted.add(code);
      }
    }
    return (index) => (store.nulls[index] === 1 ? nullPasses : wanted.has(store.codes[index] ?? 0));
  }
  const wanted = new Set<number>();

  for (const value of values) {
    const key = numericValue(value);

    if (key !== null) {
      wanted.add(key);
    }
  }
  return (index) => (store.nulls[index] === 1 ? nullPasses : wanted.has(store.keys[index] ?? 0));
};

const mismatch = (filter: GridFilter, expected: string): Error =>
  new Error(
    `Grid engine filter "${filter.kind}" needs ${expected} column${'key' in filter ? ` "${filter.key}"` : ''}`,
  );

export const compileFilter = <T>(
  filter: GridFilter,
  column: GridEngineColumn<T> | undefined,
  store: ColumnStore | undefined,
): RowTest => {
  if (column === undefined || store === undefined) {
    throw new Error('Grid engine filter needs a built column store');
  }
  switch (filter.kind) {
    case 'text': {
      if (store.kind !== 'string') {
        throw mismatch(filter, 'a string');
      }
      return stringTest(store, textMatcher(filter), filter.op === 'empty');
    }
    case 'number': {
      if (store.kind !== 'number' || column.kind === 'date') {
        throw mismatch(filter, 'a number or boolean');
      }
      return rangeTest(store, filter.min, filter.max);
    }
    case 'date': {
      if (store.kind !== 'number' || column.kind !== 'date') {
        throw mismatch(filter, 'a date');
      }
      return rangeTest(store, filter.from, filter.to);
    }
    case 'set':
      return setTest(store, filter.values);
    case 'quick':
      throw new Error('Grid engine quick filters compile against every string column');
  }
};

export const compileQuick = (
  value: string,
  stores: readonly Extract<ColumnStore, { kind: 'string' }>[],
): RowTest => {
  const needle = value.toLocaleLowerCase();

  if (needle === '' || stores.length === 0) {
    return () => true;
  }

  const tests = stores.map((store) =>
    stringTest(store, (candidate) => candidate.toLocaleLowerCase().includes(needle), false),
  );

  return (index) => tests.some((test) => test(index));
};

export const createFilterJob = (count: number, tests: readonly RowTest[]): FilterJob => {
  const pass = new Uint8Array(count);
  let position = 0;

  return {
    total: () => count,
    done: () => position,
    work: (deadline) => {
      while (position < count) {
        let passes = true;

        for (const test of tests) {
          if (!test(position)) {
            passes = false;
            break;
          }
        }
        pass[position] = passes ? 1 : 0;
        position += 1;

        if (position % CHECK_INTERVAL === 0 && performance.now() >= deadline) {
          return false;
        }
      }
      return true;
    },
    pass: () => pass,
  };
};

export const compactPass = (pass: Uint8Array): Uint32Array => {
  let kept = 0;

  for (let index = 0; index < pass.length; index += 1) {
    kept += pass[index] ?? 0;
  }
  const indices = new Uint32Array(kept);
  let cursor = 0;

  for (let index = 0; index < pass.length; index += 1) {
    if (pass[index] === 1) {
      indices[cursor] = index;
      cursor += 1;
    }
  }
  return indices;
};
