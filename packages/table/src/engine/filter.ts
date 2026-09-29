import { CHECK_INTERVAL, type SliceJob } from './slicer';
import type {
  ColumnStore,
  GridEngineColumn,
  GridFilter,
  GridFilterValue,
  StringCodes,
} from './engine.types';

export type RowTest = (index: number) => boolean;

export interface FilterJob extends SliceJob {
  pass(): Uint8Array;
}

export interface FilterSetup extends SliceJob {
  tests(): RowTest[];
}

export interface FilterSources<T> {
  readonly column: (key: string) => GridEngineColumn<T> | undefined;
  readonly store: (key: string) => ColumnStore | undefined;
  readonly quickStores: (keys: readonly string[] | undefined) => readonly StringCodes[];
}

type TextMatch = (lowered: string) => boolean;

type NumberStore = Extract<ColumnStore, { kind: 'number' }>;

type CodedStore = Exclude<ColumnStore, { kind: 'number' }>;

interface ScanState {
  readonly dictionary: readonly string[];
  readonly map: Uint8Array;
  hits: number;
}

type DictionaryScan =
  | (ScanState & { readonly kind: 'lowered'; readonly match: TextMatch })
  | (ScanState & { readonly kind: 'exact'; readonly wanted: ReadonlySet<string> });

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
  const next = (dictionary[code] ?? '').toLocaleLowerCase();
  lowered[code] = next;
  return next;
};

const scanHit = (scan: DictionaryScan, lowered: string[], code: number): boolean => {
  switch (scan.kind) {
    case 'lowered':
      return scan.match(loweredAt(scan.dictionary, lowered, code));
    case 'exact':
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

const textMatcher = (filter: Extract<GridFilter, { kind: 'text' }>): TextMatch => {
  const needle = filter.value.toLocaleLowerCase();

  switch (filter.op) {
    case 'contains':
      return (candidate) => candidate.includes(needle);
    case 'equals':
      return (candidate) => candidate === needle;
    case 'starts':
      return (candidate) => candidate.startsWith(needle);
    case 'empty':
      return (candidate) => candidate === '';
  }
};

const codedTest =
  (store: StringCodes, map: Uint8Array, nullPasses: boolean): RowTest =>
  (index) =>
    store.nulls[index] === 1 ? nullPasses : map[store.codes[index] ?? 0] === 1;

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

const numericValue = (value: GridFilterValue): number | null => {
  switch (typeof value) {
    case 'number':
      return value;
    case 'boolean':
      return value ? 1 : 0;
    default:
      return null;
  }
};

const numberSetTest = (store: NumberStore, values: readonly GridFilterValue[]): RowTest => {
  const nullPasses = values.includes(null);
  const wanted = new Set<number>();

  for (const value of values) {
    const key = numericValue(value);

    if (key !== null) {
      wanted.add(key);
    }
  }
  return (index) => (store.nulls[index] === 1 ? nullPasses : wanted.has(store.keys[index] ?? 0));
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

const mismatch = (filter: GridFilter, expected: string): Error =>
  new Error(
    `Grid engine filter "${filter.kind}" needs ${expected} column${'key' in filter ? ` "${filter.key}"` : ''}`,
  );

const sourceOf = <T>(
  sources: FilterSources<T>,
  key: string,
): { readonly column: GridEngineColumn<T>; readonly store: ColumnStore } => {
  const column = sources.column(key);
  const store = sources.store(key);

  if (column === undefined || store === undefined) {
    throw new Error('Grid engine filter needs a built column store');
  }
  return { column, store };
};

const setPending = (store: ColumnStore, values: readonly GridFilterValue[]): PendingTest => {
  if (store.kind === 'number') {
    return ready(numberSetTest(store, values));
  }
  const nullPasses = values.includes(null);
  const strings = values.filter((value) => typeof value === 'string');
  const scan = exactScan(store.dictionary, new Set(nullPasses ? [...strings, ''] : strings));

  return { scans: [scan], test: () => codedTest(store, scan.map, nullPasses) };
};

const quickPending = (value: string, stores: readonly StringCodes[]): PendingTest => {
  const needle = value.toLocaleLowerCase();

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
        lanes
          .filter((lane) => lane.scan.hits > 0)
          .map((lane) => ({
            codes: lane.store.codes,
            nulls: lane.store.nulls,
            map: lane.scan.map,
          })),
      ),
  };
};

const textPending = (
  filter: Extract<GridFilter, { kind: 'text' }>,
  store: CodedStore,
): PendingTest => {
  const scan = loweredScan(store.dictionary, textMatcher(filter));
  return { scans: [scan], test: () => codedTest(store, scan.map, filter.op === 'empty') };
};

const pendingFor = <T>(filter: GridFilter, sources: FilterSources<T>): PendingTest => {
  if (filter.kind === 'quick') {
    return quickPending(filter.value, sources.quickStores(filter.keys));
  }
  const { column, store } = sourceOf(sources, filter.key);

  switch (filter.kind) {
    case 'text':
      if (store.kind === 'number') {
        throw mismatch(filter, 'a string');
      }
      return textPending(filter, store);
    case 'number':
      if (store.kind !== 'number' || column.kind === 'date') {
        throw mismatch(filter, 'a number or boolean');
      }
      return ready(rangeTest(store, filter.min, filter.max));
    case 'date':
      if (store.kind !== 'number' || column.kind !== 'date') {
        throw mismatch(filter, 'a date');
      }
      return ready(rangeTest(store, filter.from, filter.to));
    case 'set':
      return setPending(store, filter.values);
  }
};

export const createFilterSetup = <T>(
  filters: readonly GridFilter[],
  sources: FilterSources<T>,
): FilterSetup => {
  const pending = filters.map((filter) => pendingFor(filter, sources));
  const job = createScanJob(pending.flatMap((entry) => entry.scans));

  return {
    total: job.total,
    done: job.done,
    work: job.work,
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
    if (pass[index] === 1) {
      indices[cursor] = index;
      cursor += 1;
    }
  }
  return indices;
};
