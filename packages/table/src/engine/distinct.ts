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

interface DistinctJob extends SliceJob {
  result(): TableDistinct;
}

export const distinctStrings = (store: RankedStrings, limit: number): TableDistinct => {
  const values: TableFilterValue[] = [];
  const blank = store.dictionary.includes('');
  const filled = store.dictionary.length - (blank ? 1 : 0);

  for (const code of store.sortedCodes) {
    const entry = store.dictionary[code] ?? '';

    if (values.length === limit) {
      break;
    }
    if (entry === '') {
      continue;
    }

    values.push(entry);
  }
  if (filled > limit || !(blank || store.nulls.includes(1))) {
    return { values, truncated: filled > limit };
  }
  return { values: [...values, null], truncated: false };
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
): DistinctJob => {
  const kept: number[] = [];
  const length = store.keys.length;
  let position = 0;
  let blank = false;

  return {
    total: () => length,
    done: () => position,
    work: (deadline) => {
      while (position < length) {
        if (store.nulls[position] === 1) {
          blank = true;
        } else {
          insertBounded(kept, store.keys[position] ?? 0, limit + 1);
        }
        position += 1;

        if (position % CHECK_INTERVAL === 0 && performance.now() >= deadline) {
          return false;
        }
      }
      return true;
    },
    result: () => {
      const truncated = kept.length > limit;
      const values = kept.slice(0, limit).map((key) => numberValue(column, key));

      return truncated || !blank
        ? { values, truncated }
        : { values: [...values, null], truncated: false };
    },
  };
};
