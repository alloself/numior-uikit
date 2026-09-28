import { CHECK_INTERVAL, type SliceJob } from './slicer';
import { createSortJob } from './sort';
import type { ColumnStore, GridEngineColumn } from './engine.types';

export interface StoreJob extends SliceJob {
  result(): ColumnStore;
}

type NumberRead<T> = (row: T) => number | null | undefined;

const timeOf = (value: Date | number | null | undefined): number | null | undefined =>
  value instanceof Date ? value.getTime() : value;

const numberReader = <T>(column: GridEngineColumn<T>): NumberRead<T> | null => {
  switch (column.kind) {
    case 'number':
      return column.value;
    case 'boolean':
      return (row) => {
        const value = column.value(row);
        return value === null || value === undefined ? value : value ? 1 : 0;
      };
    case 'date':
      return (row) => timeOf(column.value(row));
    case 'string':
      return null;
  }
};

const dueNow = (count: number, deadline: number): boolean =>
  count % CHECK_INTERVAL === 0 && performance.now() >= deadline;

const createNumberStoreJob = <T>(rows: readonly T[], read: NumberRead<T>): StoreJob => {
  const length = rows.length;
  const keys = new Float64Array(length);
  const nulls = new Uint8Array(length);
  let position = 0;

  return {
    total: () => length,
    done: () => position,
    work: (deadline) => {
      while (position < length) {
        const row = rows[position];
        const value = row === undefined ? null : read(row);

        if (value === null || value === undefined || Number.isNaN(value)) {
          nulls[position] = 1;
        } else {
          keys[position] = value;
        }
        position += 1;

        if (dueNow(position, deadline)) {
          return false;
        }
      }
      return true;
    },
    result: () => ({ kind: 'number', keys, nulls }),
  };
};

const createStringStoreJob = <T>(
  rows: readonly T[],
  read: (row: T) => string | null | undefined,
  collator: Intl.Collator,
): StoreJob => {
  const length = rows.length;
  const codes = new Uint32Array(length);
  const nulls = new Uint8Array(length);
  const dictionary: string[] = [];
  const codeOf = new Map<string, number>();
  let position = 0;
  let order: Uint32Array | null = null;
  let sorting: SliceJob | null = null;
  let rankOf: Uint32Array | null = null;
  let ranks: Uint32Array | null = null;
  let ranked = 0;

  const collect = (deadline: number): boolean => {
    while (position < length) {
      const row = rows[position];
      const value = row === undefined ? null : read(row);

      if (value === null || value === undefined) {
        nulls[position] = 1;
      } else {
        let code = codeOf.get(value);

        if (code === undefined) {
          code = dictionary.length;
          dictionary.push(value);
          codeOf.set(value, code);
        }
        codes[position] = code;
      }
      position += 1;

      if (dueNow(position, deadline)) {
        return false;
      }
    }
    return true;
  };

  const rankJob = (): SliceJob => {
    if (sorting === null) {
      const indices = new Uint32Array(dictionary.length);

      for (let index = 0; index < indices.length; index += 1) {
        indices[index] = index;
      }
      order = indices;

      sorting = createSortJob(indices, (a, b) =>
        collator.compare(dictionary[a] ?? '', dictionary[b] ?? ''),
      );
    }
    return sorting;
  };

  const rankTable = (): Uint32Array => {
    if (rankOf === null) {
      const table = new Uint32Array(dictionary.length);
      const sorted = order ?? new Uint32Array(0);

      for (let place = 0; place < sorted.length; place += 1) {
        table[sorted[place] ?? 0] = place;
      }
      rankOf = table;
    }
    return rankOf;
  };

  const assign = (deadline: number): boolean => {
    const table = rankTable();
    const target = ranks ?? new Uint32Array(length);
    ranks = target;

    while (ranked < length) {
      target[ranked] = table[codes[ranked] ?? 0] ?? 0;
      ranked += 1;

      if (dueNow(ranked, deadline)) {
        return false;
      }
    }
    return true;
  };

  return {
    total: () => length * 2 + (sorting?.total() ?? 0),
    done: () => position + (sorting?.done() ?? 0) + ranked,
    work: (deadline) => {
      if (position < length && !collect(deadline)) {
        return false;
      }
      if (!rankJob().work(deadline)) {
        return false;
      }
      return assign(deadline);
    },
    result: () => ({ kind: 'string', ranks: ranks ?? new Uint32Array(0), nulls, dictionary }),
  };
};

export const createStoreJob = <T>(
  column: GridEngineColumn<T>,
  rows: readonly T[],
  collator: Intl.Collator,
): StoreJob => {
  const read = numberReader(column);

  if (read !== null) {
    return createNumberStoreJob(rows, read);
  }
  return column.kind === 'string'
    ? createStringStoreJob(rows, column.value, collator)
    : createNumberStoreJob(rows, () => null);
};
