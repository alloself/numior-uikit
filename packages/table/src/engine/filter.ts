import { CHECK_INTERVAL, type SliceJob } from './slicer';
import {
  ColumnStoreKind,
  DictionaryScanKind,
  TableEngineColumnKind,
  TableFilterKind,
  TableTextOp,
  type ColumnStore,
  type StringCodes,
  type TableEngineColumn,
  type TableFilter,
  type TableFilterValue,
} from './engine.types';

export type RowTest = (index: number) => boolean;

export interface FilterJob extends SliceJob {
  pass(): Uint8Array;
}

export interface FilterSetup extends SliceJob {
  tests(): RowTest[];
}

export interface FilterSources<T> {
  readonly column: (key: string) => TableEngineColumn<T> | undefined;
  readonly store: (key: string) => ColumnStore | undefined;
  readonly quickStores: (keys: readonly string[] | undefined) => readonly StringCodes[];
}

type TextMatch = (lowered: string) => boolean;

type NumberStore = Extract<ColumnStore, { kind: 'number' }>;

type CodedStore = Exclude<ColumnStore, { kind: 'number' }>;

type SetFilter = Extract<TableFilter, { kind: 'set' }>;

interface ScanState {
  readonly dictionary: readonly string[];
  readonly map: Uint8Array;
  hits: number;
}

type DictionaryScan =
  | (ScanState & { readonly kind: typeof DictionaryScanKind.Lowered; readonly match: TextMatch })
  | (ScanState & {
      readonly kind: typeof DictionaryScanKind.Exact;
      readonly wanted: ReadonlySet<string>;
    });

interface PendingTest {
  readonly scans: readonly DictionaryScan[];
  readonly test: () => RowTest;
}

interface QuickLane {
  readonly codes: Uint32Array;
  readonly nulls: Uint8Array;
  readonly map: Uint8Array;
}

const loweredCache = new WeakMap<readonly string[], string[]>();

const loweredOf = (dictionary: readonly string[]): string[] => {
  const cached = loweredCache.get(dictionary);

  if (cached !== undefined) {
    return cached;
  }
  const created: string[] = [];
  loweredCache.set(dictionary, created);
  return created;
};

const loweredAt = (dictionary: readonly string[], lowered: string[], code: number): string => {
  const known = lowered[code];

  if (known !== undefined) {
    return known;
  }
  const next = (dictionary[code] ?? '').toLowerCase();
  lowered[code] = next;
  return next;
};

export const createLoweringJob = (dictionaries: readonly (readonly string[])[]): SliceJob => {
  const total = dictionaries.reduce((sum, dictionary) => sum + dictionary.length, 0);
  let current = 0;
  let code = 0;
  let done = 0;

  return {
    total: () => Math.max(1, total),
    done: () => done,
    work: (deadline) => {
      for (
        let dictionary = dictionaries[current];
        dictionary !== undefined;
        dictionary = dictionaries[current]
      ) {
        const lowered = loweredOf(dictionary);

        while (code < dictionary.length) {
          const stop = Math.min(dictionary.length, code + CHECK_INTERVAL);

          for (let at = code; at < stop; at += 1) {
            loweredAt(dictionary, lowered, at);
          }
          done += stop - code;
          code = stop;
          if (performance.now() >= deadline) {
            return false;
          }
        }
        current += 1;
        code = 0;
      }
      return true;
    },
  };
};

const scanHit = (scan: DictionaryScan, lowered: string[], code: number): boolean => {
  switch (scan.kind) {
    case DictionaryScanKind.Lowered:
      return scan.match(loweredAt(scan.dictionary, lowered, code));
    case DictionaryScanKind.Exact:
      return scan.wanted.has(scan.dictionary[code] ?? '');
  }
};

const createScanJob = (scans: readonly DictionaryScan[]): SliceJob => {
  const total = scans.reduce((sum, scan) => sum + scan.dictionary.length, 0);
  let current = 0;
  let code = 0;
  let done = 0;

  return {
    total: () => Math.max(1, total),
    done: () => done,
    work: (deadline) => {
      for (let scan = scans[current]; scan !== undefined; scan = scans[current]) {
        const lowered = loweredOf(scan.dictionary);

        while (code < scan.dictionary.length) {
          if (scanHit(scan, lowered, code)) {
            scan.map[code] = 1;
            scan.hits += 1;
          }
          code += 1;
          done += 1;

          if (code % CHECK_INTERVAL === 0 && performance.now() >= deadline) {
            return false;
          }
        }
        current += 1;
        code = 0;
      }
      return true;
    },
  };
};

const loweredScan = (dictionary: readonly string[], match: TextMatch): DictionaryScan => ({
  kind: 'lowered',
  dictionary,
  match,
  map: new Uint8Array(dictionary.length),
  hits: 0,
});

const exactScan = (dictionary: readonly string[], wanted: ReadonlySet<string>): DictionaryScan => ({
  kind: 'exact',
  dictionary,
  wanted,
  map: new Uint8Array(dictionary.length),
  hits: 0,
});

const textMatcher = (filter: Extract<TableFilter, { kind: 'text' }>): TextMatch => {
  const needle = filter.value.toLowerCase();

  switch (filter.op) {
    case TableTextOp.Contains:
      return (candidate) => candidate.includes(needle);
    case TableTextOp.Equals:
      return (candidate) => candidate === needle;
    case TableTextOp.Starts:
      return (candidate) => candidate.startsWith(needle);
    case TableTextOp.Empty:
      return (candidate) => candidate === '';
  }
};

const codedTest =
  (store: StringCodes, map: Uint8Array, nullPasses: boolean, hit: 0 | 1): RowTest =>
  (index) =>
    store.nulls[index] === 1 ? nullPasses : map[store.codes[index] ?? 0] === hit;

const rangeTest = (
  store: NumberStore,
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

const numericValue = (value: TableFilterValue): number | null => {
  switch (typeof value) {
    case 'number':
      return value;
    case 'boolean':
      return value ? 1 : 0;
    default:
      return null;
  }
};

const numberSetTest = (store: NumberStore, filter: SetFilter): RowTest => {
  const outside = filter.exclude === true;
  const nullPasses = filter.values.includes(null) !== outside;
  const wanted = new Set<number>();

  for (const value of filter.values) {
    const key = numericValue(value);

    if (key === null) {
      continue;
    }

    wanted.add(key);
  }
  return (index) =>
    store.nulls[index] === 1 ? nullPasses : wanted.has(store.keys[index] ?? 0) !== outside;
};

const quickTest =
  (lanes: readonly QuickLane[]): RowTest =>
  (index) => {
    for (const lane of lanes) {
      if (lane.nulls[index] !== 1 && lane.map[lane.codes[index] ?? 0] === 1) {
        return true;
      }
    }
    return false;
  };

const ready = (test: RowTest): PendingTest => ({ scans: [], test: () => test });

const mismatch = (filter: TableFilter, expected: string): Error =>
  new Error(
    `Table engine filter "${filter.kind}" needs ${expected} column${'key' in filter ? ` "${filter.key}"` : ''}`,
  );

const sourceOf = <T>(
  sources: FilterSources<T>,
  key: string,
): { readonly column: TableEngineColumn<T>; readonly store: ColumnStore } => {
  const column = sources.column(key);
  const store = sources.store(key);

  if (column === undefined || store === undefined) {
    throw new Error('Table engine filter needs a built column store');
  }
  return { column, store };
};

const setPending = (store: ColumnStore, filter: SetFilter): PendingTest => {
  if (store.kind === ColumnStoreKind.Number) {
    return ready(numberSetTest(store, filter));
  }
  const outside = filter.exclude === true;
  const blank = filter.values.includes(null);
  const strings = filter.values.filter((value) => typeof value === 'string');
  const scan = exactScan(store.dictionary, new Set(blank ? [...strings, ''] : strings));

  return {
    scans: [scan],
    test: () => codedTest(store, scan.map, blank !== outside, outside ? 0 : 1),
  };
};

const quickPending = (value: string, stores: readonly StringCodes[]): PendingTest => {
  const needle = value.toLowerCase();

  if (needle === '') {
    return ready(() => true);
  }
  if (stores.length === 0) {
    return ready(() => false);
  }

  const lanes = stores.map((store) => ({
    store,
    scan: loweredScan(store.dictionary, (candidate) => candidate.includes(needle)),
  }));

  return {
    scans: lanes.map((lane) => lane.scan),
    test: () =>
      quickTest(
        lanes.flatMap((lane) =>
          lane.scan.hits > 0
            ? [{ codes: lane.store.codes, nulls: lane.store.nulls, map: lane.scan.map }]
            : [],
        ),
      ),
  };
};

const textPending = (
  filter: Extract<TableFilter, { kind: 'text' }>,
  store: CodedStore,
): PendingTest => {
  const scan = loweredScan(store.dictionary, textMatcher(filter));
  const blankPasses = filter.op === TableTextOp.Empty || filter.value === '';

  return { scans: [scan], test: () => codedTest(store, scan.map, blankPasses, 1) };
};

const pendingFor = <T>(filter: TableFilter, sources: FilterSources<T>): PendingTest => {
  if (filter.kind === TableFilterKind.Quick) {
    return quickPending(filter.value, sources.quickStores(filter.keys));
  }
  const { column, store } = sourceOf(sources, filter.key);

  switch (filter.kind) {
    case TableFilterKind.Text:
      if (store.kind === ColumnStoreKind.Number) {
        throw mismatch(filter, 'a string');
      }
      return textPending(filter, store);
    case TableFilterKind.Number:
      if (store.kind !== ColumnStoreKind.Number || column.kind === TableEngineColumnKind.Date) {
        throw mismatch(filter, 'a number or boolean');
      }
      return ready(rangeTest(store, filter.min, filter.max));
    case TableFilterKind.Date:
      if (store.kind !== ColumnStoreKind.Number || column.kind !== TableEngineColumnKind.Date) {
        throw mismatch(filter, 'a date');
      }
      return ready(rangeTest(store, filter.from, filter.to));
    case TableFilterKind.Set:
      return setPending(store, filter);
  }
};

export const createFilterSetup = <T>(
  filters: readonly TableFilter[],
  sources: FilterSources<T>,
): FilterSetup => {
  const pending = filters.map((filter) => pendingFor(filter, sources));
  const job = createScanJob(pending.flatMap((entry) => entry.scans));

  return {
    total: () => job.total(),
    done: () => job.done(),
    work: (deadline) => job.work(deadline),
    tests: () => pending.map((entry) => entry.test()),
  };
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
    if (pass[index] !== 1) {
      continue;
    }

    indices[cursor] = index;
    cursor += 1;
  }
  return indices;
};
