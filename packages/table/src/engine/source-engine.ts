import { createBlockCache, type BlockCache } from './block-cache';
import {
  blockKeyOf,
  createSourceLayouts,
  createSourceStore,
  storeOfBlockKey,
  type SourceSpan,
  type SourceSpot,
  type SourceStore,
} from './source-tree';
import {
  ErrorName,
  SourceHolds,
  TableNodeKind,
  type TableEngine,
  type TableFetchResult,
  type TableFilter,
  type TableGroupsResult,
  type TableNode,
  type TableNodeId,
  type TableQuery,
  type TableRunResult,
  type TableSort,
  type TableSourceEngineOptions,
  type TableSourceGroup,
} from './engine.types';

interface SourceRange {
  readonly from: number;
  readonly to: number;
}

interface SourceRun<T> {
  readonly store: SourceStore<T>;
  readonly first: number;
  readonly last: number;
}

interface SourceAnswer {
  readonly total?: number | undefined;
  readonly hasMore?: boolean | undefined;
}

const CACHE_BLOCKS = 50;
const CONCURRENCY = 2;
const COLLECT_CHUNK = 1000;
const EMPTY_SORT: readonly TableSort[] = [];
const EMPTY_FILTERS: readonly TableFilter[] = [];
const EMPTY_KEYS: readonly string[] = [];
const EMPTY_PATH: readonly unknown[] = [];
const NO_AGGREGATES: Readonly<Record<string, unknown>> = {};
const CANCELLED: TableRunResult = { kind: 'cancelled' };

const groupsKeyOf = (query: TableQuery): string => JSON.stringify(query.groupBy ?? EMPTY_KEYS);

const keyOfQuery = (query: TableQuery): string =>
  JSON.stringify([query.sort ?? EMPTY_SORT, query.filters ?? EMPTY_FILTERS, groupsKeyOf(query)]);

const isAbort = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'name' in error && error.name === ErrorName.Abort;

const isGroups = <T>(result: TableFetchResult<T>): result is TableGroupsResult =>
  'groups' in result;

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

const rowsIn = (groups: readonly TableSourceGroup[]): number =>
  groups.reduce((sum, group) => sum + group.count, 0);

export const createSourceEngine = <T>(options: TableSourceEngineOptions<T>): TableEngine<T> => {
  const rowBlocks = createBlockCache<T>(options.cacheBlocks ?? CACHE_BLOCKS);
  const groupBlocks = createBlockCache<TableSourceGroup>(options.cacheBlocks ?? CACHE_BLOCKS);
  const concurrency = options.concurrency ?? CONCURRENCY;
  const inflight = new Set<string>();
  const listeners = new Set<() => void>();
  const stores = new Map<string, SourceStore<T>>();
  let expanded: ReadonlySet<TableNodeId> = new Set();
  let query: TableQuery = {};
  let queryKey = keyOfQuery(query);
  let version = 0;
  let controller = new AbortController();
  let size = Math.max(1, options.blockSize());
  let failed = false;
  let running = 0;
  let range: SourceRange = { from: 0, to: 0 };
  let wanted = false;
  let totalsDue = false;
  let totalsController = new AbortController();
  let sums: Readonly<Record<string, unknown>> = {};

  const groupKeys = (): readonly string[] => query.groupBy ?? EMPTY_KEYS;

  const holdsAt = (depth: number): SourceHolds => (depth < groupKeys().length ? 'groups' : 'rows');

  const rootStore = (total: number | undefined): SourceStore<T> => {
    const store = createSourceStore<T>({
      key: '',
      level: 0,
      path: EMPTY_PATH,
      holds: holdsAt(0),
      known: undefined,
      parent: undefined,
      owner: undefined,
    });

    store.total = total;
    return store;
  };

  let root = rootStore(undefined);

  const ownCount = (store: SourceStore<T>): number => {
    if (store.total !== undefined) {
      return store.total;
    }
    if (store !== root && !store.answered) {
      return 1;
    }
    return store.loadedEnd + (store.more ? size : 0);
  };

  const layouts = createSourceLayouts<T>(ownCount);
  const count = (): number => layouts.sizeOf(root);

  const entryIn = <V>(blocks: BlockCache<V>, store: SourceStore<T>, index: number): V | undefined =>
    blocks.get(blockKeyOf(store.key, Math.floor(index / size)))?.[index % size];

  const rowIn = (spot: SourceSpot<T>): T | undefined =>
    spot.store.holds === SourceHolds.Rows ? entryIn(rowBlocks, spot.store, spot.index) : undefined;

  const groupIn = (spot: SourceSpot<T>): TableSourceGroup | undefined =>
    spot.store.holds === SourceHolds.Groups
      ? entryIn(groupBlocks, spot.store, spot.index)
      : undefined;

  const rowAt = (position: number): T | undefined => {
    const spot = layouts.locate(root, position);
    return spot === undefined ? undefined : rowIn(spot);
  };

  const notify = (): void => {
    for (const listener of listeners) {
      listener();
    }
  };

  const reset = (keepTotal: boolean): void => {
    version += 1;
    controller.abort();
    controller = new AbortController();
    rowBlocks.clear();
    groupBlocks.clear();
    inflight.clear();
    stores.clear();
    running = 0;
    failed = false;
    root = rootStore(keepTotal ? root.total : undefined);
    layouts.invalidate();
  };

  const groupIdOf = (store: SourceStore<T>, group: TableSourceGroup): string =>
    JSON.stringify([...store.path, group.value]);

  const childOf = (store: SourceStore<T>, group: TableSourceGroup): SourceStore<T> => {
    const path = [...store.path, group.value];
    const key = JSON.stringify(path);
    const holds = holdsAt(path.length);

    const child =
      stores.get(key) ??
      createSourceStore<T>({
        key,
        level: store.level + 1,
        path,
        holds,
        known: holds === SourceHolds.Rows ? group.count : undefined,
        parent: undefined,
        owner: key,
      });

    stores.set(key, child);
    return child;
  };

  const adopt = (
    store: SourceStore<T>,
    offset: number,
    groups: readonly TableSourceGroup[],
  ): void => {
    groups.forEach((group, at) => {
      const id = groupIdOf(store, group);

      if (!expanded.has(id) || store.open.has(offset + at)) {
        return;
      }

      store.open.set(offset + at, { id, store: childOf(store, group) });
    });
  };

  const parental = (row: T): boolean =>
    options.source.children !== undefined && options.hasChildren?.(row) === true;

  const rowIdOf = (store: SourceStore<T>, index: number, row: T): TableNodeId =>
    options.keyOf?.(row) ?? (store === root ? index : `${store.key}/${index}`);

  const branchOf = (store: SourceStore<T>, id: TableNodeId, row: T): SourceStore<T> => {
    const key = `~${JSON.stringify(id)}`;

    const child =
      stores.get(key) ??
      createSourceStore<T>({
        key,
        level: store.level + 1,
        path: EMPTY_PATH,
        holds: 'rows',
        known: undefined,
        parent: row,
        owner: id,
      });

    stores.set(key, child);
    return child;
  };

  const detailed = (row: T): boolean =>
    options.source.children === undefined && options.detail?.(row) === true;

  const detailOf = (store: SourceStore<T>, id: TableNodeId, row: T): SourceStore<T> => {
    const key = `!${JSON.stringify(id)}`;

    const child =
      stores.get(key) ??
      createSourceStore<T>({
        key,
        level: store.level + 1,
        path: EMPTY_PATH,
        holds: 'detail',
        known: 1,
        parent: row,
        owner: id,
      });

    child.answered = true;
    stores.set(key, child);
    return child;
  };

  const branchFor = (
    store: SourceStore<T>,
    id: TableNodeId,
    row: T,
  ): SourceStore<T> | undefined => {
    if (parental(row)) {
      return branchOf(store, id, row);
    }
    return detailed(row) ? detailOf(store, id, row) : undefined;
  };

  const adoptRows = (store: SourceStore<T>, offset: number, rows: readonly T[]): void => {
    if (options.source.children === undefined && options.detail === undefined) {
      return;
    }

    rows.forEach((row, at) => {
      const id = rowIdOf(store, offset + at, row);

      const branch =
        expanded.has(id) && !store.open.has(offset + at) ? branchFor(store, id, row) : undefined;

      if (branch === undefined) {
        return;
      }

      store.open.set(offset + at, { id, store: branch });
    });
  };

  const storeOf = (key: string): SourceStore<T> | undefined =>
    key === '' ? root : stores.get(key);

  const reopen = (): void => {
    for (const store of [root, ...stores.values()]) {
      for (const [index, branch] of store.open) {
        if (expanded.has(branch.id)) {
          continue;
        }

        store.open.delete(index);
      }
    }
    for (const [key, groups] of groupBlocks.entries()) {
      const at = storeOfBlockKey(key);
      const store = storeOf(at.store);

      if (store === undefined) {
        continue;
      }

      adopt(store, at.block * size, groups);
    }
    for (const [key, rows] of rowBlocks.entries()) {
      const at = storeOfBlockKey(key);
      const store = storeOf(at.store);

      if (store === undefined) {
        continue;
      }

      adoptRows(store, at.block * size, rows);
    }
    layouts.invalidate();
  };

  const keep = <V>(
    blocks: BlockCache<V>,
    store: SourceStore<T>,
    offset: number,
    entries: readonly V[],
  ): void => {
    for (let start = 0; start < entries.length; start += size) {
      blocks.set(
        blockKeyOf(store.key, Math.floor((offset + start) / size)),
        entries.slice(start, start + size),
      );
    }
  };

  const settle = (
    store: SourceStore<T>,
    offset: number,
    loaded: number,
    limit: number,
    answer: SourceAnswer,
  ): void => {
    const end = offset + loaded;

    if (end >= store.loadedEnd) {
      store.more =
        answer.hasMore ?? (loaded >= limit && (store.known === undefined || end < store.known));
    }
    store.loadedEnd = Math.max(store.loadedEnd, end);
    store.total = answer.total ?? (store.more ? store.known : store.loadedEnd);
    store.answered = true;
    layouts.invalidate();
  };

  const absorb = (
    store: SourceStore<T>,
    offset: number,
    limit: number,
    result: TableFetchResult<T>,
  ): void => {
    if (isGroups(result)) {
      keep(groupBlocks, store, offset, result.groups);
      adopt(store, offset, result.groups);
      settle(store, offset, result.groups.length, limit, result);
    } else {
      keep(rowBlocks, store, offset, result.rows);
      adoptRows(store, offset, result.rows);
      settle(store, offset, result.rows.length, limit, result);
    }
  };

  const fits = (store: SourceStore<T>, result: TableFetchResult<T>): boolean =>
    isGroups(result) === (store.holds === SourceHolds.Groups);

  const release = (run: SourceRun<T>): void => {
    const held = inflight.delete(blockKeyOf(run.store.key, run.first));

    for (let block = run.first + 1; block <= run.last; block += 1) {
      inflight.delete(blockKeyOf(run.store.key, block));
    }
    if (!held) {
      return;
    }

    running -= 1;
  };

  const fail = (error: unknown): void => {
    failed = true;
    notify();

    if (isAbort(error)) {
      return;
    }

    options.onError(error);
  };

  const land = (run: SourceRun<T>, result: TableFetchResult<T>): void => {
    if (!fits(run.store, result)) {
      fail(new Error(`Table source answered a level of ${run.store.holds} with the other kind`));
      return;
    }
    absorb(run.store, run.first * size, (run.last - run.first + 1) * size, result);
    notify();
    options.onChange();
    ensure(range.from, range.to);
  };

  const answerOf = async (run: SourceRun<T>): Promise<TableFetchResult<T>> => {
    const sort = query.sort ?? EMPTY_SORT;
    const filters = query.filters ?? EMPTY_FILTERS;
    const { signal } = controller;
    const { parent } = run.store;

    if (parent !== undefined && options.source.children !== undefined) {
      const rows = await options.source.children({ row: parent, sort, filters, signal });

      return { rows, total: rows.length, hasMore: false };
    }
    return options.source.fetch({
      offset: run.first * size,
      limit: (run.last - run.first + 1) * size,
      sort,
      filters,
      groupBy: groupKeys(),
      groupPath: run.store.path,
      signal,
    });
  };

  const request = async (own: number, run: SourceRun<T>): Promise<void> => {
    try {
      const result = await answerOf(run);

      if (own === version) {
        release(run);
        land(run, result);
      }
    } catch (error) {
      if (own === version) {
        release(run);
        fail(error);
      }
    }
  };

  const load = (run: SourceRun<T>): void => {
    for (let block = run.first; block <= run.last; block += 1) {
      inflight.add(blockKeyOf(run.store.key, block));
    }
    running += 1;
    void request(version, run);
  };

  const resize = (): void => {
    const next = Math.max(1, options.blockSize());

    if (next === size) {
      return;
    }

    size = next;
    reset(false);
    notify();
    options.onChange();
  };

  const beyond = (store: SourceStore<T>, block: number): boolean => {
    const start = block * size;

    return store.total === undefined
      ? !store.more && start >= store.loadedEnd
      : start >= store.total;
  };

  const missingIn = (span: SourceSpan<T>): SourceRun<T>[] => {
    const { store } = span;

    if (store.holds === SourceHolds.Detail) {
      return [];
    }
    const blocks = store.holds === SourceHolds.Rows ? rowBlocks : groupBlocks;
    const missing: number[] = [];

    for (
      let block = Math.floor(span.from / size);
      block <= Math.floor((span.to - 1) / size);
      block += 1
    ) {
      const key = blockKeyOf(store.key, block);

      if (blocks.has(key)) {
        blocks.touch(key);
      } else if (!inflight.has(key) && !beyond(store, block)) {
        missing.push(block);
      }
    }
    if (store.parent !== undefined) {
      return missing.length > 0 && !inflight.has(blockKeyOf(store.key, 0))
        ? [{ store, first: 0, last: 0 }]
        : [];
    }
    return runsOf(missing).map(([first, last]) => ({ store, first, last }));
  };

  const spansOf = (from: number, to: number): SourceSpan<T>[] => {
    const known = layouts.sizeOf(root);
    const inner = ownCount(root);
    const found = layouts.spans(root, from, Math.min(to, known));

    return to > known && root.total === undefined
      ? [
          ...found,
          {
            store: root,
            from: Math.max(from, known) - (known - inner),
            to: to - (known - inner),
            base: known - inner,
          },
        ]
      : found;
  };

  const ensure = (from: number, to: number): void => {
    range = { from, to };
    wanted = true;
    resize();

    const start = Math.max(0, from);

    for (const run of spansOf(start, Math.max(start + 1, to)).flatMap(missingIn)) {
      if (running >= concurrency) {
        break;
      }
      load(run);
    }
    void pullTotals();
  };

  const fill = (): void => {
    if (!wanted) {
      return;
    }

    ensure(range.from, range.to);
  };

  const apply = (next: TableQuery): void => {
    const nextKey = keyOfQuery(next);
    const regrouped = groupsKeyOf(next) !== groupsKeyOf(query);

    query = next;

    if (nextKey === queryKey) {
      return;
    }

    queryKey = nextKey;
    reset(!regrouped);
    notify();
    options.onChange();
    fill();
  };

  const whenAnswered = (own: number): Promise<void> =>
    new Promise((resolve) => {
      const check = (): void => {
        const waiting = !root.answered && !failed && own === version;

        if (waiting) {
          return;
        }

        listeners.delete(check);
        resolve();
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
        groupBy: EMPTY_KEYS,
        groupPath: EMPTY_PATH,
        signal: signal ?? controller.signal,
      });

      const found = isGroups(result) ? [] : result.rows;
      const next = offset + found.length;

      for (const entry of found) {
        rows.push(entry);
      }

      if (
        found.length !== COLLECT_CHUNK ||
        result.hasMore === false ||
        (result.total !== undefined && next >= result.total)
      ) {
        return;
      }

      await page(next);
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
    if (next.totals !== true) {
      return;
    }

    totalsDue = true;
  };

  const groupNode = (store: SourceStore<T>, group: TableSourceGroup): TableNode<T> => {
    const id = groupIdOf(store, group);

    return {
      kind: 'group',
      id,
      key: groupKeys()[store.level] ?? '',
      value: group.value,
      path: [...store.path, group.value],
      level: store.level,
      count: group.count,
      expanded: expanded.has(id),
      aggregates: group.aggregates ?? NO_AGGREGATES,
    };
  };

  const rowNode = (spot: SourceSpot<T>, position: number, row: T): TableNode<T> => {
    const id = rowIdOf(spot.store, spot.index, row);
    const expandable = parental(row) || detailed(row);
    const branch = spot.store.open.get(spot.index);

    return {
      kind: 'row',
      id,
      index: position,
      row,
      level: spot.store.level,
      expandable,
      expanded: expandable && expanded.has(id),
      unloaded: false,
      loading: branch !== undefined && !branch.store.answered,
    };
  };

  const detailNode = ({ holds, parent, owner, level }: SourceStore<T>): TableNode<T> | undefined =>
    holds === SourceHolds.Detail && parent !== undefined && owner !== undefined
      ? { kind: 'detail', id: owner, row: parent, level }
      : undefined;

  const nodeAt = (position: number): TableNode<T> | undefined => {
    const spot = layouts.locate(root, position);

    if (spot === undefined) {
      return undefined;
    }
    const row = rowIn(spot);

    if (row !== undefined) {
      return rowNode(spot, position, row);
    }
    const group = groupIn(spot);

    return group === undefined ? detailNode(spot.store) : groupNode(spot.store, group);
  };

  const detailsOf = (): number[] => {
    const positions: number[] = [];

    for (const [store, base] of layouts.bases(root)) {
      for (const [index, branch] of store.open) {
        if (branch.store.holds !== SourceHolds.Detail || index >= ownCount(store)) {
          continue;
        }

        positions.push(layouts.flatOf(store, base, index) + 1);
      }
    }
    return positions.toSorted((a, b) => a - b);
  };

  const loaded = (): Uint32Array => {
    const bases = layouts.bases(root);
    const positions: number[] = [];

    for (const [key, rows] of rowBlocks.entries()) {
      const at = storeOfBlockKey(key);
      const store = at.store === '' ? root : stores.get(at.store);
      const base = store === undefined ? undefined : bases.get(store);

      if (store === undefined || base === undefined) {
        continue;
      }

      for (let offset = 0; offset < rows.length; offset += 1) {
        positions.push(layouts.flatOf(store, base, at.block * size + offset));
      }
    }
    return Uint32Array.from(positions.toSorted((a, b) => a - b));
  };

  const rowCount = (): number =>
    root.holds === SourceHolds.Rows
      ? count() - detailsOf().length
      : groupBlocks
          .entries()
          .reduce(
            (sum, [key, groups]) =>
              storeOfBlockKey(key).store === '' ? sum + rowsIn(groups) : sum,
            0,
          );

  const setToggled = (ids: Iterable<TableNodeId>): void => {
    expanded = new Set(ids);
    reopen();
    fill();
  };

  const setExpanded = (id: TableNodeId, open: boolean): void => {
    const next = new Set(expanded);

    if (open) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setToggled(next);
  };

  const pendingAt = (position: number): boolean => {
    const spot = layouts.locate(root, position);

    return (
      spot !== undefined &&
      spot.store.holds !== SourceHolds.Detail &&
      rowIn(spot) === undefined &&
      groupIn(spot) === undefined
    );
  };

  return {
    count,
    rowCount,
    setRows: () => undefined,
    run: async (next, runOptions = {}) => {
      apply(next);
      expectTotals(next);

      const own = version;

      await Promise.all([whenAnswered(own), pullTotals()]);

      return own !== version || runOptions.signal?.aborted === true
        ? CANCELLED
        : { kind: 'done', count: count(), rows: rowCount() };
    },
    runSync: (next) => {
      apply(next);
      expectTotals(next);
      void pullTotals();
      return { kind: 'done', count: count(), rows: rowCount() };
    },
    patch: () => undefined,
    prepare: async () => true,
    visibleIndices: loaded,
    nodeAt,
    positionsOf: () => [],
    details: detailsOf,
    siblingsAt: () => undefined,
    rowAt,
    toggle: (position) => {
      const node = nodeAt(position);

      if (
        node?.kind !== TableNodeKind.Group &&
        (node?.kind !== TableNodeKind.Row || !node.expandable)
      ) {
        return;
      }

      setExpanded(node.id, !node.expanded);
    },
    setExpanded,
    setToggled,
    isExpanded: (id) => expanded.has(id),
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
    pendingAt,
    collect,
    ensure,
    refresh: () => {
      reset(true);
      totalsDue = true;
      notify();
      options.onChange();
      fill();
    },
    settled: () => root.answered || root.total !== undefined,
    dispose: () => {
      version += 1;
      controller.abort();
      totalsController.abort();
      rowBlocks.clear();
      groupBlocks.clear();
      inflight.clear();
      stores.clear();
      listeners.clear();
    },
  };
};
