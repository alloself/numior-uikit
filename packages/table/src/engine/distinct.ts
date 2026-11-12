import { escapeRegExp } from 'lodash-es';
import { CHECK_INTERVAL, type SliceJob } from './slicer';
import {
  TableEngineColumnKind,
  type ColumnStore,
  type StringCodes,
  type TableDistinct,
  type TableEngineColumn,
  type TableFilterValue,
} from './engine.types';

type NumberStore = Extract<ColumnStore, { kind: 'number' }>;

type RankedStrings = Extract<ColumnStore, { kind: 'string' }>;

type Order = (left: number, right: number) => number;

type EntryTest = (entry: string) => boolean;

interface FirstCodes {
  readonly collator: Intl.Collator;
  readonly kept: readonly number[];
  readonly cap: number;
}

export interface DistinctJob extends SliceJob {
  result(): TableDistinct;
}

export interface DistinctSearch {
  readonly pattern: RegExp | undefined;
  readonly text: ((value: TableFilterValue) => string) | undefined;
}

export const distinctSearch = (
  search: string | undefined,
  text: ((value: TableFilterValue) => string) | undefined,
): DistinctSearch => {
  const needle = (search ?? '').trim();

  return { pattern: needle === '' ? undefined : new RegExp(escapeRegExp(needle), 'iu'), text };
};

const listed = (
  values: readonly TableFilterValue[],
  blank: boolean,
  truncated: boolean,
): TableDistinct => ({ values: blank ? [...values, null] : values, truncated });

const entryTest = (search: DistinctSearch): EntryTest => {
  const { pattern, text } = search;

  return (entry) =>
    entry !== '' &&
    (pattern === undefined || pattern.test(text === undefined ? entry : text(entry)));
};

const blankListed = (codes: StringCodes, search: DistinctSearch): boolean =>
  search.pattern === undefined && (codes.dictionary.includes('') || codes.nulls.includes(1));

const insertBounded = (kept: number[], key: number, cap: number, order: Order): void => {
  const last = kept.at(-1);

  if (kept.length === cap && last !== undefined && order(key, last) >= 0) {
    return;
  }
  let low = 0;
  let high = kept.length;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);

    if (order(kept[middle] ?? 0, key) < 0) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  const found = kept[low];

  if (found !== undefined && order(found, key) === 0) {
    return;
  }
  kept.splice(low, 0, key);

  if (kept.length <= cap) {
    return;
  }

  kept.pop();
};

const numberOrder: Order = (left, right) => Number(left > right) - Number(left < right);

const firstCodes = new WeakMap<readonly string[], FirstCodes>();

const knownFirst = (
  dictionary: readonly string[],
  collator: Intl.Collator,
  cap: number,
): readonly number[] | undefined => {
  const known = firstCodes.get(dictionary);

  if (known?.collator !== collator) {
    return undefined;
  }
  return known.cap >= cap || known.kept.length < known.cap ? known.kept : undefined;
};

const rememberFirst = (
  dictionary: readonly string[],
  collator: Intl.Collator,
  kept: readonly number[],
  cap: number,
): void => {
  const known = firstCodes.get(dictionary);

  if (known?.collator === collator && known.cap >= cap) {
    return;
  }

  firstCodes.set(dictionary, { collator, kept, cap });
};

export const createDistinctCodesJob = (
  codes: StringCodes,
  limit: number,
  search: DistinctSearch,
  collator: Intl.Collator,
): DistinctJob => {
  const { dictionary } = codes;
  const holds = entryTest(search);
  const cap = limit + 1;
  const listing = search.pattern === undefined;
  const known = listing ? knownFirst(dictionary, collator, cap) : undefined;
  const kept: number[] = known?.slice(0, cap) ?? [];
  let position = known === undefined ? 0 : dictionary.length;

  const order: Order = (left, right) =>
    collator.compare(dictionary[left] ?? '', dictionary[right] ?? '') || left - right;

  return {
    total: () => dictionary.length,
    done: () => position,
    work: (deadline) => {
      while (position < dictionary.length) {
        if (holds(dictionary[position] ?? '')) {
          insertBounded(kept, position, cap, order);
        }
        position += 1;

        if (position % CHECK_INTERVAL === 0 && performance.now() >= deadline) {
          return false;
        }
      }
      if (known === undefined && listing) {
        rememberFirst(dictionary, collator, kept, cap);
      }
      return true;
    },
    result: () =>
      listed(
        kept.slice(0, limit).map((code) => dictionary[code] ?? ''),
        blankListed(codes, search),
        kept.length > limit,
      ),
  };
};

export const createDistinctStringsJob = (
  store: RankedStrings,
  limit: number,
  search: DistinctSearch,
): DistinctJob => {
  const { dictionary, sortedCodes } = store;
  const holds = entryTest(search);
  const matched = search.pattern === undefined ? undefined : new Uint8Array(dictionary.length);
  const values: TableFilterValue[] = [];
  let marked = 0;
  let position = 0;
  let more = false;

  const mark = (deadline: number): boolean => {
    if (matched === undefined) {
      return true;
    }

    while (marked < dictionary.length) {
      matched[marked] = Number(holds(dictionary[marked] ?? ''));
      marked += 1;

      if (marked % CHECK_INTERVAL === 0 && performance.now() >= deadline) {
        return false;
      }
    }
    return true;
  };

  const fits = (code: number): boolean => {
    if (matched === undefined ? !holds(dictionary[code] ?? '') : matched[code] !== 1) {
      return true;
    }
    if (values.length === limit) {
      return false;
    }
    values.push(dictionary[code] ?? '');
    return true;
  };

  return {
    total: () => (matched?.length ?? 0) + sortedCodes.length,
    done: () => (matched === undefined ? 0 : marked) + position,
    work: (deadline) => {
      if (!mark(deadline)) {
        return false;
      }

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
    result: () => listed(values, blankListed(store, search), more),
  };
};

const numberValue = <T>(column: TableEngineColumn<T>, key: number): TableFilterValue =>
  column.kind === TableEngineColumnKind.Boolean ? key === 1 : key;

export const createDistinctNumbersJob = <T>(
  column: TableEngineColumn<T>,
  store: NumberStore,
  limit: number,
  search: DistinctSearch,
): DistinctJob => {
  const { pattern, text } = search;
  const kept: number[] = [];
  const verdicts = new Map<number, boolean>();
  const length = store.keys.length;
  let position = 0;
  let blank = false;

  const read = (key: number): boolean => {
    const value = numberValue(column, key);

    return pattern?.test(text === undefined ? String(value) : text(value)) ?? true;
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

    if (pattern !== undefined && !holds(key)) {
      return;
    }
    insertBounded(kept, key, limit + 1, numberOrder);
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
        blank && pattern === undefined,
        kept.length > limit,
      ),
  };
};
