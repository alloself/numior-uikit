import { CHECK_INTERVAL, type SliceJob } from './slicer';
import { createCollatedSortJob } from './collated-sort';
import { workerRankHost, type RankHost } from './rank-host';
import { identityIndices } from './sort';
import {
  ColumnStoreKind,
  StoreNeed,
  TableEngineColumnKind,
  type ColumnStore,
  type StringCodes,
  type TableEngineColumn,
} from './engine.types';

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
    case TableEngineColumnKind.Number:
      return column.value;
    case TableEngineColumnKind.Boolean:
      return (row) => {
        const value = column.value(row);
        return value === null || value === undefined ? value : value ? 1 : 0;
      };
    case TableEngineColumnKind.Date:
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

export const createRankJob = (
  source: StringCodes,
  collator: Intl.Collator,
  host: RankHost | undefined = workerRankHost,
): StoreJob => {
  const { codes, dictionary } = source;
  const length = codes.length;
  const order = identityIndices(dictionary.length);
  const ranks = new Uint32Array(length);
  const rankOf = new Uint32Array(dictionary.length);
  let placed = 0;
  let rank = 0;
  let ranked = 0;

  const sorting = createCollatedSortJob(order, dictionary, collator, host);

  const textAt = (place: number): string => dictionary[order[place] ?? 0] ?? '';

  const place = (deadline: number): boolean => {
    while (placed < order.length) {
      if (placed > 0 && collator.compare(textAt(placed - 1), textAt(placed)) !== 0) {
        rank += 1;
      }
      rankOf[order[placed] ?? 0] = rank;
      placed += 1;

      if (dueNow(placed, deadline)) {
        return false;
      }
    }
    return true;
  };

  return {
    total: () => sorting.total() + order.length + length,
    done: () => sorting.done() + placed + ranked,
    waiting: () => sorting.waiting?.(),
    work: (deadline) => {
      if (!sorting.work(deadline) || !place(deadline)) {
        return false;
      }

      while (ranked < length) {
        ranks[ranked] = rankOf[codes[ranked] ?? 0] ?? 0;
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
    waiting: () => ranking?.waiting?.(),
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
  if (column.kind !== TableEngineColumnKind.String) {
    return createNumberStoreJob(rows, numberReader(column));
  }
  const codes = createCodesJob(rows, column.value);
  return need === StoreNeed.Codes ? codes : createRankedStringJob(codes, collator);
};

export const createRequestJob = <T>(
  request: StoreRequest<T>,
  rows: readonly T[],
  collator: Intl.Collator,
): StoreJob =>
  request.need === StoreNeed.Ranks && request.current?.kind === ColumnStoreKind.Codes
    ? createRankJob(request.current, collator)
    : createStoreJob(request.column, rows, collator, request.need);

export const createStoresJob = <T>(
  requests: readonly StoreRequest<T>[],
  size: number,
  jobOf: (request: StoreRequest<T>) => StoreJob,
  onStore: (key: string, store: ColumnStore) => void,
): SliceJob => {
  let position = 0;
  let current: StoreJob | null = null;

  const currentJob = (): StoreJob | null => {
    const request = requests[position];

    if (request === undefined) {
      return null;
    }
    current ??= jobOf(request);
    return current;
  };

  return {
    total: () => Math.max(1, requests.length * size),
    done: () => position * size + (current?.done() ?? 0),
    waiting: () => current?.waiting?.(),
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
