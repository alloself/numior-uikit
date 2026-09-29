import { CHECK_INTERVAL, type SliceJob } from './slicer';
import { createSortJob, identityIndices } from './sort';
import type { ColumnStore, TableEngineColumn, StoreNeed, StringCodes } from './engine.types';

export interface StoreJob extends SliceJob {
  result(): ColumnStore;
}

type NumberRead<T> = (row: T) => number | null | undefined;

type NumberColumn<T> = Exclude<TableEngineColumn<T>, { kind: 'string' }>;

export interface StoreRequest<T> {
  readonly column: TableEngineColumn<T>;
  readonly need: StoreNeed;
  readonly current: ColumnStore | undefined;
}

interface CodesJob extends SliceJob {
  result(): StringCodes & { readonly kind: 'codes' };
}

const timeOf = (value: Date | number | null | undefined): number | null | undefined =>
  value instanceof Date ? value.getTime() : value;

const numberReader = <T>(column: NumberColumn<T>): NumberRead<T> => {
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

const createCodesJob = <T>(
  rows: readonly T[],
  read: (row: T) => string | null | undefined,
): CodesJob => {
  const length = rows.length;
  const codes = new Uint32Array(length);
  const nulls = new Uint8Array(length);
  const dictionary: string[] = [];
  const codeOf = new Map<string, number>();
  let position = 0;

  return {
    total: () => length,
    done: () => position,
    work: (deadline) => {
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
    },
    result: () => ({ kind: 'codes', codes, nulls, dictionary }),
  };
};

export const createRankJob = (source: StringCodes, collator: Intl.Collator): StoreJob => {
  const { codes, dictionary } = source;
  const length = codes.length;
  const order = identityIndices(dictionary.length);
  const ranks = new Uint32Array(length);
  let rankOf: Uint32Array | null = null;
  let ranked = 0;

  const sorting = createSortJob(order, (a, b) =>
    collator.compare(dictionary[a] ?? '', dictionary[b] ?? ''),
  );

  const rankTable = (): Uint32Array => {
    if (rankOf === null) {
      const table = new Uint32Array(dictionary.length);

      for (let place = 0; place < order.length; place += 1) {
        table[order[place] ?? 0] = place;
      }
      rankOf = table;
    }
    return rankOf;
  };

  return {
    total: () => sorting.total() + length,
    done: () => sorting.done() + ranked,
    work: (deadline) => {
      if (!sorting.work(deadline)) {
        return false;
      }
      const table = rankTable();

      while (ranked < length) {
        ranks[ranked] = table[codes[ranked] ?? 0] ?? 0;
        ranked += 1;

        if (dueNow(ranked, deadline)) {
          return false;
        }
      }
      return true;
    },
    result: () => ({
      kind: 'string',
      codes,
      nulls: source.nulls,
      dictionary,
      ranks,
      sortedCodes: order,
    }),
  };
};

const createRankedStringJob = (codes: CodesJob, collator: Intl.Collator): StoreJob => {
  let ranking: StoreJob | null = null;

  return {
    total: () => codes.total() + (ranking?.total() ?? codes.total()),
    done: () => codes.done() + (ranking?.done() ?? 0),
    work: (deadline) => {
      if (ranking === null) {
        if (!codes.work(deadline)) {
          return false;
        }
        ranking = createRankJob(codes.result(), collator);
      }
      return ranking.work(deadline);
    },
    result: () => (ranking ?? codes).result(),
  };
};

export const createStoreJob = <T>(
  column: TableEngineColumn<T>,
  rows: readonly T[],
  collator: Intl.Collator,
  need: StoreNeed,
): StoreJob => {
  if (column.kind !== 'string') {
    return createNumberStoreJob(rows, numberReader(column));
  }
  const codes = createCodesJob(rows, column.value);
  return need === 'codes' ? codes : createRankedStringJob(codes, collator);
};

const jobFor = <T>(
  request: StoreRequest<T>,
  rows: readonly T[],
  collator: Intl.Collator,
): StoreJob =>
  request.need === 'ranks' && request.current?.kind === 'codes'
    ? createRankJob(request.current, collator)
    : createStoreJob(request.column, rows, collator, request.need);

export const createStoresJob = <T>(
  requests: readonly StoreRequest<T>[],
  rows: readonly T[],
  collator: Intl.Collator,
  onStore: (key: string, store: ColumnStore) => void,
): SliceJob => {
  let position = 0;
  let current: StoreJob | null = null;

  const currentJob = (): StoreJob | null => {
    const request = requests[position];

    if (request === undefined) {
      return null;
    }
    current ??= jobFor(request, rows, collator);
    return current;
  };

  return {
    total: () => Math.max(1, requests.length * rows.length),
    done: () => position * rows.length + (current?.done() ?? 0),
    work: (deadline) => {
      for (let job = currentJob(); job !== null; job = currentJob()) {
        if (!job.work(deadline)) {
          return false;
        }
        onStore(requests[position]?.column.key ?? '', job.result());
        current = null;
        position += 1;

        if (position < requests.length && performance.now() >= deadline) {
          return false;
        }
      }
      return true;
    },
  };
};
