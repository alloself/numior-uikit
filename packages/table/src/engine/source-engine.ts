import { createBlockCache } from './block-cache';
import type {
  TableEngine,
  TableFetchResult,
  TableFilter,
  TableNode,
  TableQuery,
  TableRunResult,
  TableSort,
  TableSourceEngineOptions,
} from './engine.types';

interface SourceRange {
  readonly from: number;
  readonly to: number;
}

const CACHE_BLOCKS = 50;
const CONCURRENCY = 2;
const COLLECT_CHUNK = 1000;
const EMPTY_SORT: readonly TableSort[] = [];
const EMPTY_FILTERS: readonly TableFilter[] = [];
const CANCELLED: TableRunResult = { kind: 'cancelled' };

const keyOfQuery = (query: TableQuery): string =>
  JSON.stringify([query.sort ?? EMPTY_SORT, query.filters ?? EMPTY_FILTERS]);

const isAbort = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError';

const runsOf = (blocks: readonly number[]): Array<[number, number]> =>
  blocks.reduce<Array<[number, number]>>((runs, block) => {
    const last = runs.at(-1);

    if (last !== undefined && last[1] === block - 1) {
      last[1] = block;
    } else {
      runs.push([block, block]);
    }
    return runs;
  }, []);

export const createSourceEngine = <T>(options: TableSourceEngineOptions<T>): TableEngine<T> => {
  const blocks = createBlockCache<T>(options.cacheBlocks ?? CACHE_BLOCKS);
  const concurrency = options.concurrency ?? CONCURRENCY;
  const inflight = new Set<number>();
  const listeners = new Set<() => void>();
  let query: TableQuery = {};
  let queryKey = keyOfQuery(query);
  let version = 0;
  let controller = new AbortController();
  let size = Math.max(1, options.blockSize());
  let total: number | undefined;
  let more = true;
  let loadedEnd = 0;
  let answered = false;
  let failed = false;
  let running = 0;
  let range: SourceRange = { from: 0, to: 0 };
  let wanted = false;
  let totalsDue = false;
  let totalsController = new AbortController();
  let sums: Readonly<Record<string, unknown>> = {};

  const count = (): number => total ?? loadedEnd + (more ? size : 0);

  const rowAt = (position: number): T | undefined =>
    position < 0 ? undefined : blocks.get(Math.floor(position / size))?.[position % size];

  const notify = (): void => {
    for (const listener of listeners) {
      listener();
    }
  };

  const reset = (): void => {
    version += 1;
    controller.abort();
    controller = new AbortController();
    blocks.clear();
    inflight.clear();
    running = 0;
    answered = false;
    failed = false;
    loadedEnd = 0;
    more = true;
  };

  const beyond = (block: number): boolean => {
    const start = block * size;
    return total === undefined ? !more && start >= loadedEnd : start >= total;
  };

  const absorb = (offset: number, limit: number, result: TableFetchResult<T>): void => {
    const end = offset + result.rows.length;

    for (let start = 0; start < result.rows.length; start += size) {
      blocks.set(Math.floor((offset + start) / size), result.rows.slice(start, start + size));
    }
    if (end >= loadedEnd) {
      more = result.hasMore ?? result.rows.length >= limit;
    }
    loadedEnd = Math.max(loadedEnd, end);
    total = result.total ?? (more ? undefined : loadedEnd);
    answered = true;
  };

  const release = (first: number, last: number): void => {
    for (let block = first; block <= last; block += 1) {
      inflight.delete(block);
    }
    running -= 1;
  };

  const request = async (own: number, first: number, last: number): Promise<void> => {
    const offset = first * size;
    const limit = (last - first + 1) * size;

    try {
      const result = await options.source.fetch({
        offset,
        limit,
        sort: query.sort ?? EMPTY_SORT,
        filters: query.filters ?? EMPTY_FILTERS,
        signal: controller.signal,
      });

      if (own === version) {
        release(first, last);
        absorb(offset, limit, result);
        notify();
        options.onChange();
        ensure(range.from, range.to);
      }
    } catch (error) {
      if (own === version) {
        release(first, last);
        failed = true;
        notify();

        if (!isAbort(error)) {
          options.onError(error);
        }
      }
    }
  };

  const load = (first: number, last: number): void => {
    for (let block = first; block <= last; block += 1) {
      inflight.add(block);
    }
    running += 1;
    void request(version, first, last);
  };

  const resize = (): void => {
    const next = Math.max(1, options.blockSize());

    if (next !== size) {
      size = next;
      reset();
      notify();
      options.onChange();
    }
  };

  const ensure = (from: number, to: number): void => {
    range = { from, to };
    wanted = true;
    resize();

    const first = Math.floor(Math.max(0, from) / size);
    const last = Math.floor(Math.max(0, from, to - 1) / size);
    const missing: number[] = [];

    for (let block = first; block <= last; block += 1) {
      if (blocks.has(block)) {
        blocks.touch(block);
      } else if (!inflight.has(block) && !beyond(block)) {
        missing.push(block);
      }
    }
    for (const [start, end] of runsOf(missing)) {
      if (running >= concurrency) {
        break;
      }
      load(start, end);
    }
    void pullTotals();
  };

  const fill = (): void => {
    if (wanted) {
      ensure(range.from, range.to);
    }
  };

  const apply = (next: TableQuery): void => {
    const nextKey = keyOfQuery(next);

    query = next;

    if (nextKey !== queryKey) {
      queryKey = nextKey;
      reset();
      notify();
      options.onChange();
      fill();
    }
  };

  const whenAnswered = (own: number): Promise<void> =>
    new Promise((resolve) => {
      const check = (): void => {
        if (answered || failed || own !== version) {
          listeners.delete(check);
          resolve();
        }
      };

      listeners.add(check);
      check();
    });

  const filtersKey = (): string => JSON.stringify(query.filters ?? EMPTY_FILTERS);

  const loadTotals = async (): Promise<void> => {
    if (options.source.totals === undefined) {
      return;
    }
    const key = filtersKey();

    totalsController.abort();
    totalsController = new AbortController();

    const { signal } = totalsController;

    try {
      const found = await options.source.totals({
        filters: query.filters ?? EMPTY_FILTERS,
        signal,
      });

      if (!signal.aborted && key === filtersKey()) {
        sums = found;
        options.onChange();
      }
    } catch (error) {
      if (!signal.aborted && !isAbort(error)) {
        options.onError(error);
      }
    }
  };

  const collect = async (signal: AbortSignal | undefined): Promise<readonly T[]> => {
    const rows: T[] = [];
    const sort = query.sort ?? EMPTY_SORT;
    const filters = query.filters ?? EMPTY_FILTERS;

    const page = async (offset: number): Promise<void> => {
      signal?.throwIfAborted();

      const result = await options.source.fetch({
        offset,
        limit: COLLECT_CHUNK,
        sort,
        filters,
        signal: signal ?? controller.signal,
      });

      const next = offset + result.rows.length;

      rows.push(...result.rows);

      if (
        result.rows.length === COLLECT_CHUNK &&
        result.hasMore !== false &&
        (result.total === undefined || next < result.total)
      ) {
        await page(next);
      }
    };

    await page(0);
    return rows;
  };

  const pullTotals = (): Promise<void> => {
    if (!totalsDue || !wanted) {
      return Promise.resolve();
    }
    totalsDue = false;
    return loadTotals();
  };

  const expectTotals = (next: TableQuery): void => {
    if (next.totals === true) {
      totalsDue = true;
    }
  };

  const nodeAt = (position: number): TableNode<T> | undefined => {
    const row = rowAt(position);

    return row === undefined
      ? undefined
      : {
          kind: 'row',
          id: options.keyOf?.(row) ?? position,
          index: position,
          row,
          level: 0,
          expandable: false,
          expanded: false,
          unloaded: false,
        };
  };

  const loaded = (): Uint32Array => {
    const positions: number[] = [];

    for (const block of blocks.keys()) {
      const rows = blocks.get(block) ?? [];

      for (let offset = 0; offset < rows.length; offset += 1) {
        positions.push(block * size + offset);
      }
    }
    return Uint32Array.from(positions);
  };

  return {
    count,
    rowCount: count,
    setRows: () => undefined,
    run: async (next, runOptions = {}) => {
      apply(next);
      expectTotals(next);

      const own = version;

      await Promise.all([whenAnswered(own), pullTotals()]);

      return own !== version || runOptions.signal?.aborted === true
        ? CANCELLED
        : { kind: 'done', count: count(), rows: count() };
    },
    runSync: (next) => {
      apply(next);
      expectTotals(next);
      void pullTotals();
      return { kind: 'done', count: count(), rows: count() };
    },
    patch: () => undefined,
    visibleIndices: loaded,
    nodeAt,
    siblingsAt: () => undefined,
    rowAt,
    toggle: () => undefined,
    setExpanded: () => undefined,
    setToggled: () => undefined,
    isExpanded: () => false,
    totals: () => sums,
    distinct: async (key, distinctOptions = {}) =>
      options.source.values === undefined
        ? null
        : options.source.values({
            key,
            filters: query.filters ?? EMPTY_FILTERS,
            limit: distinctOptions.limit ?? 100,
            signal: distinctOptions.signal ?? controller.signal,
          }),
    store: () => undefined,
    pendingAt: (position) => position < count() && rowAt(position) === undefined,
    collect,
    ensure,
    refresh: () => {
      reset();
      totalsDue = true;
      notify();
      options.onChange();
      fill();
    },
    settled: () => answered || total !== undefined,
    dispose: () => {
      version += 1;
      controller.abort();
      totalsController.abort();
      blocks.clear();
      inflight.clear();
      listeners.clear();
    },
  };
};
