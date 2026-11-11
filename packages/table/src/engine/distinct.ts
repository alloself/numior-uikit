import { loweredAt, loweredOf } from './filter';
import { CHECK_INTERVAL, type SliceJob } from './slicer';
import {
  TableEngineColumnKind,
  type ColumnStore,
  type TableDistinct,
  type TableEngineColumn,
  type TableFilterValue,
} from './engine.types';

type NumberStore = Extract<ColumnStore, { kind: 'number' }>;

type RankedStrings = Extract<ColumnStore, { kind: 'string' }>;

export interface DistinctJob extends SliceJob {
  result(): TableDistinct;
}

export interface DistinctSearch {
  readonly needle: string;
  readonly text: ((value: TableFilterValue) => string) | undefined;
}

export const distinctSearch = (
  search: string | undefined,
  text: ((value: TableFilterValue) => string) | undefined,
): DistinctSearch => ({ needle: (search ?? '').trim().toLowerCase(), text });

const listed = (
  values: readonly TableFilterValue[],
  blank: boolean,
  truncated: boolean,
): TableDistinct => ({ values: blank ? [...values, null] : values, truncated });

export const createDistinctStringsJob = (
  store: RankedStrings,
  limit: number,
  search: DistinctSearch,
): DistinctJob => {
  const { dictionary, sortedCodes } = store;
  const { needle, text } = search;
  const lowered = loweredOf(dictionary);
  const values: TableFilterValue[] = [];
  let position = 0;
  let more = false;

  const holds = (code: number, entry: string): boolean =>
    needle === '' ||
    (text === undefined
      ? loweredAt(dictionary, lowered, code)
      : text(entry).toLowerCase()
    ).includes(needle);

  const fits = (code: number): boolean => {
    const entry = dictionary[code] ?? '';

    if (entry === '' || !holds(code, entry)) {
      return true;
    }
    if (values.length === limit) {
      return false;
    }
    values.push(entry);
    return true;
  };

  return {
    total: () => sortedCodes.length,
    done: () => position,
    work: (deadline) => {
      while (position < sortedCodes.length) {
        if (!fits(sortedCodes[position] ?? 0)) {
          more = true;
          return true;
        }
        position += 1;

        if (position % CHECK_INTERVAL === 0 && performance.now() >= deadline) {
          return false;
        }
      }
      return true;
    },
    result: () =>
      listed(values, needle === '' && (dictionary.includes('') || store.nulls.includes(1)), more),
  };
};

const insertBounded = (kept: number[], key: number, cap: number): void => {
  const last = kept.at(-1);

  if (kept.length === cap && last !== undefined && key >= last) {
    return;
  }
  let low = 0;
  let high = kept.length;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);

    if ((kept[middle] ?? 0) < key) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  if (kept[low] === key) {
    return;
  }
  kept.splice(low, 0, key);

  if (kept.length <= cap) {
    return;
  }

  kept.pop();
};

const numberValue = <T>(column: TableEngineColumn<T>, key: number): TableFilterValue =>
  column.kind === TableEngineColumnKind.Boolean ? key === 1 : key;

export const createDistinctNumbersJob = <T>(
  column: TableEngineColumn<T>,
  store: NumberStore,
  limit: number,
  search: DistinctSearch,
): DistinctJob => {
  const { needle, text } = search;
  const kept: number[] = [];
  const verdicts = new Map<number, boolean>();
  const length = store.keys.length;
  let position = 0;
  let blank = false;

  const read = (key: number): boolean => {
    const value = numberValue(column, key);

    return (text === undefined ? String(value) : text(value)).toLowerCase().includes(needle);
  };

  const holds = (key: number): boolean => {
    const known = verdicts.get(key);

    if (known !== undefined) {
      return known;
    }
    const verdict = read(key);

    verdicts.set(key, verdict);
    return verdict;
  };

  const take = (index: number): void => {
    if (store.nulls[index] === 1) {
      blank = true;
      return;
    }
    const key = store.keys[index] ?? 0;

    if (needle !== '' && !holds(key)) {
      return;
    }
    insertBounded(kept, key, limit + 1);
  };

  return {
    total: () => length,
    done: () => position,
    work: (deadline) => {
      while (position < length) {
        take(position);
        position += 1;

        if (position % CHECK_INTERVAL === 0 && performance.now() >= deadline) {
          return false;
        }
      }
      return true;
    },
    result: () =>
      listed(
        kept.slice(0, limit).map((key) => numberValue(column, key)),
        blank && needle === '',
        kept.length > limit,
      ),
  };
};
