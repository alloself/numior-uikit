import {
  createRequestJob,
  createStoresJob,
  type StoreJob,
  type StoreRequest,
} from './column-store';
import { createDistinctNumbersJob, distinctStrings } from './distinct';
import { compactPass, createFilterJob, createFilterSetup, createLoweringJob } from './filter';
import { createGroupJob, type AggregateColumn, type GroupLevel, type GroupTable } from './group';
import { createPipeline, type Pipeline, type PipelineStage } from './pipeline';
import { runSliced, yieldToHost, type SliceJob } from './slicer';
import { createNumberRankJob, numberRanksOf } from './number-ranks';
import { createOrderJob, type OrderKey } from './order';
import { identityIndices } from './sort';
import {
  buildTreeLists,
  childrenOf,
  createPropagateJob,
  createSiblingSortJob,
  flattenTree,
  walkTree,
  type TreeLists,
  type TreeTable,
} from './tree';
import {
  ColumnStoreKind,
  StoreNeed,
  TableEngineColumnKind,
  TableFilterKind,
  TableNodeKind,
  TableSortDirection,
  type ColumnStore,
  type TableDistinct,
  type TableEngine,
  type TableEngineColumn,
  type TableEngineOptions,
  type TableFilter,
  type TableNode,
  type TableNodeId,
  type TableNodePosition,
  type TableQuery,
  type TableRunOptions,
  type TableRunResult,
  type TableSiblings,
  type TableSort,
  type TableStoreWish,
} from './engine.types';

interface Prepared {
  readonly filtered: Uint32Array;
  readonly groups: GroupTable | null;
  readonly tree: TreeLists | null;
  readonly groupDepth: number;
}

interface Plan<T> {
  readonly sort: readonly TableSort[];
  readonly filters: readonly TableFilter[];
  readonly groupBy: readonly string[];
  readonly aggregates: readonly TableEngineColumn<T>[];
  readonly needs: ReadonlyMap<string, StoreNeed>;
}

interface Building {
  readonly need: StoreNeed;
  readonly job: StoreJob;
}

const DEFAULT_SLICE_MS = 12;
const DEFAULT_DISTINCT_LIMIT = 100;
const DETAIL_REF = 2 ** 30;
const NO_DETAILS: readonly number[] = [];

const hasCodes = (
  store: ColumnStore | undefined,
): store is Exclude<ColumnStore, { kind: 'number' }> =>
  store !== undefined && store.kind !== ColumnStoreKind.Number;

const emptyPrepared = (): Prepared => ({
  filtered: new Uint32Array(0),
  groups: null,
  tree: null,
  groupDepth: 0,
});

const allPass = (count: number): Uint8Array => new Uint8Array(count).fill(1);

const identityRefs = (length: number): Int32Array => {
  const refs = new Int32Array(length);

  for (let index = 0; index < length; index += 1) {
    refs[index] = index;
  }
  return refs;
};

const isDefined = <V>(value: V | undefined): value is V => value !== undefined;

const detailPositions = (refs: Int32Array): readonly number[] => {
  const positions: number[] = [];

  refs.forEach((ref, position) => {
    if (ref >= DETAIL_REF) {
      positions.push(position);
    }
  });

  return positions;
};

export const createTableEngine = <T>(options: TableEngineOptions<T>): TableEngine<T> => {
  const columns = new Map<string, TableEngineColumn<T>>(
    options.columns.map((column) => [column.key, column]),
  );

  const stringKeys = options.columns.flatMap((column) =>
    column.kind === TableEngineColumnKind.String ? [column.key] : [],
  );

  const aggregated = options.columns.filter((column) => column.aggregate !== undefined);
  const collator = options.collator ?? new Intl.Collator(undefined, { numeric: true });
  const sliceMs = options.sliceMs ?? DEFAULT_SLICE_MS;
  const yieldTo = options.yieldTo ?? yieldToHost;
  const defaultExpanded = options.defaultExpanded ?? true;
  let table: TreeTable<T> = { rows: [], parents: new Int32Array(0), depths: new Uint16Array(0) };
  let stores = new Map<string, ColumnStore>();
  let building = new Map<string, Building>();
  let prepared = emptyPrepared();
  let visible: Int32Array = new Int32Array(0);
  let details: readonly number[] = NO_DETAILS;
  let generation = 0;
  let rowsVersion = 0;
  const toggled = new Set<TableNodeId>();

  const columnOf = (key: string): TableEngineColumn<T> => {
    const column = columns.get(key);

    if (column === undefined) {
      throw new Error(`Table engine has no column "${key}"`);
    }
    return column;
  };

  const idOf = (index: number): TableNodeId => {
    const row = table.rows[index];
    return options.keyOf !== undefined && row !== undefined ? options.keyOf(row) : index;
  };

  const isExpanded = (id: TableNodeId): boolean => defaultExpanded !== toggled.has(id);

  const unloadedRow = (row: T): boolean =>
    options.hasChildren?.(row) === true && (options.children?.(row)?.length ?? 0) === 0;

  const missing = (key: string, need: StoreNeed): boolean => {
    const store = stores.get(key);
    return (
      store === undefined || (need === StoreNeed.Ranks && store.kind === ColumnStoreKind.Codes)
    );
  };

  const storeJobOf = (request: StoreRequest<T>): StoreJob => {
    const key = request.column.key;
    const known = building.get(key);

    if (known !== undefined && (known.need === StoreNeed.Ranks || known.need === request.need)) {
      return known.job;
    }

    const job = createRequestJob(request, table.rows, collator, options.rankHost);

    building.set(key, { need: request.need, job });
    return job;
  };

  const keepStore = (key: string, store: ColumnStore): void => {
    stores.set(key, store);
    building.delete(key);
  };

  const forget = (key: string): void => {
    stores.delete(key);
    building.get(key)?.job.cancel?.();
    building.delete(key);
  };

  const dropBuilding = (): void => {
    for (const { job } of building.values()) {
      job.cancel?.();
    }
    building = new Map();
  };

  const storesJob = (needs: Iterable<readonly [string, StoreNeed]>): SliceJob | null => {
    const pending = [...needs].flatMap(([key, need]) =>
      missing(key, need) ? [{ column: columnOf(key), need, current: stores.get(key) }] : [],
    );

    return pending.length === 0
      ? null
      : createStoresJob(pending, table.rows.length, storeJobOf, keepStore);
  };

  const storesStage = (
    needs: ReadonlyMap<string, StoreNeed>,
    next: () => PipelineStage | null,
  ): PipelineStage | null => {
    const job = storesJob(needs);

    return job === null ? next() : { phase: 'keys', job, next };
  };

  const finishingJob = (wish: TableStoreWish): SliceJob | null => {
    const store = stores.get(wish.key);

    if (store === undefined) {
      return null;
    }
    if (store.kind !== ColumnStoreKind.Number) {
      return wish.need === StoreNeed.Codes ? createLoweringJob([store.dictionary]) : null;
    }
    return wish.need === StoreNeed.Ranks && numberRanksOf(store) === undefined
      ? createNumberRankJob(store)
      : null;
  };

  const quickKeys = (keys: readonly string[] | undefined): readonly string[] => {
    if (keys === undefined) {
      return stringKeys;
    }
    const wanted = new Set(keys);

    return stringKeys.filter((key) => wanted.has(key));
  };

  const filterKeys = (filter: TableFilter): readonly string[] =>
    filter.kind === TableFilterKind.Quick ? quickKeys(filter.keys) : [columnOf(filter.key).key];

  const planOf = (query: TableQuery): Plan<T> => {
    const sort = query.sort ?? [];

    const filters = (query.filters ?? []).filter(
      (filter) => filter.kind !== TableFilterKind.Quick || filter.value !== '',
    );

    const groupBy = query.groupBy ?? [];

    if (groupBy.length > 0 && options.children !== undefined) {
      throw new Error('Table engine cannot group rows of a tree');
    }
    const aggregates = groupBy.length > 0 || query.totals === true ? aggregated : [];
    const needs = new Map<string, StoreNeed>();

    const want = (key: string, need: StoreNeed): void => {
      const resolved = columnOf(key).key;

      if (needs.get(resolved) !== StoreNeed.Ranks) {
        needs.set(resolved, need);
      }
    };

    for (const entry of sort) {
      want(entry.key, 'ranks');
    }
    for (const key of groupBy) {
      want(key, 'ranks');
    }
    for (const key of [...aggregates.map((column) => column.key), ...filters.flatMap(filterKeys)]) {
      want(key, 'codes');
    }
    return { sort, filters, groupBy, aggregates, needs };
  };

  const filterSources = {
    column: (key: string) => columns.get(key),
    store: (key: string) => stores.get(key),
    quickStores: (keys: readonly string[] | undefined) =>
      quickKeys(keys)
        .map((key) => stores.get(key))
        .filter(hasCodes),
  };

  const orderKeysOf = (plan: Plan<T>): OrderKey[] => {
    const leading = plan.groupBy.map((key): TableSort => ({ key, direction: 'asc' }));

    return [...leading, ...plan.sort].flatMap((sort) => {
      const store = stores.get(sort.key);

      return store === undefined || store.kind === ColumnStoreKind.Codes
        ? []
        : [{ store, descending: sort.direction === TableSortDirection.Desc }];
    });
  };

  const filterStage = (
    plan: Plan<T>,
    next: (pass: Uint8Array) => PipelineStage | null,
  ): PipelineStage | null => {
    if (plan.filters.length === 0) {
      return next(allPass(table.rows.length));
    }
    const setup = createFilterSetup(plan.filters, filterSources);

    const passStage = (): PipelineStage => {
      const job = createFilterJob(table.rows.length, setup.tests());

      const propagate = (): PipelineStage => ({
        phase: 'filter',
        job: createPropagateJob(job.pass(), table.parents),
        next: () => next(job.pass()),
      });

      return {
        phase: 'filter',
        job,
        next: () => (options.children === undefined ? next(job.pass()) : propagate()),
      };
    };

    return { phase: 'filter', job: setup, next: passStage };
  };

  const groupStage = (
    plan: Plan<T>,
    filtered: Uint32Array,
    finish: (next: Prepared) => void,
  ): PipelineStage | null => {
    if (plan.groupBy.length === 0 && plan.aggregates.length === 0) {
      finish({ filtered, groups: null, tree: null, groupDepth: 0 });
      return null;
    }

    const levels = plan.groupBy.flatMap((key): GroupLevel<T>[] => {
      const store = stores.get(key);
      return store === undefined ? [] : [{ column: columnOf(key), store }];
    });

    const aggregates = plan.aggregates.flatMap((column): AggregateColumn<T>[] => {
      const store = stores.get(column.key);

      return store === undefined || column.aggregate === undefined
        ? []
        : [{ key: column.key, store, aggregate: column.aggregate }];
    });

    const job = createGroupJob(table.rows, filtered, levels, aggregates);

    return {
      phase: 'group',
      job,
      next: () => {
        finish({ filtered, groups: job.result(), tree: null, groupDepth: plan.groupBy.length });
        return null;
      },
    };
  };

  const flatStages = (
    plan: Plan<T>,
    pass: Uint8Array,
    finish: (next: Prepared) => void,
  ): PipelineStage | null => {
    const filtered =
      plan.filters.length === 0 ? identityIndices(table.rows.length) : compactPass(pass);

    const keys = orderKeysOf(plan);

    return keys.length === 0
      ? groupStage(plan, filtered, finish)
      : {
          phase: 'sort',
          job: createOrderJob(filtered, keys),
          next: () => groupStage(plan, filtered, finish),
        };
  };

  const treeStages = (
    plan: Plan<T>,
    pass: Uint8Array,
    finish: (next: Prepared) => void,
  ): PipelineStage | null => {
    const tree = buildTreeLists(pass, table.parents);

    const complete = (): null => {
      finish({ filtered: new Uint32Array(0), groups: null, tree, groupDepth: 0 });
      return null;
    };

    const keys = orderKeysOf(plan);

    return keys.length === 0
      ? complete()
      : {
          phase: 'sort',
          job: createSiblingSortJob(tree, (indices) => createOrderJob(indices, keys)),
          next: complete,
        };
  };

  const pipelineFor = (
    plan: Plan<T>,
    finish: (next: Prepared) => void,
    runOptions: TableRunOptions = {},
  ): Pipeline | null =>
    createPipeline(
      storesStage(plan.needs, () =>
        filterStage(plan, (pass) =>
          options.children === undefined
            ? flatStages(plan, pass, finish)
            : treeStages(plan, pass, finish),
        ),
      ),
      (stage) => {
        const total = stage.job.total();
        runOptions.onProgress?.({ phase: stage.phase, done: total, total });
      },
    );

  const commit = (next: Prepared | null): TableRunResult => {
    if (next === null) {
      return { kind: 'cancelled' };
    }
    prepared = next;
    refresh();
    return { kind: 'done', count: visible.length, rows: prepared.filtered.length };
  };

  const detailsOn = (): boolean =>
    options.detail !== undefined &&
    options.children === undefined &&
    (defaultExpanded || toggled.size > 0);

  const detailed = (position: number): boolean => {
    const index = prepared.filtered[position];
    const row = index === undefined ? undefined : table.rows[index];

    return (
      index !== undefined &&
      row !== undefined &&
      isExpanded(idOf(index)) &&
      options.detail?.(row) === true
    );
  };

  const flattenRows = (): Int32Array => {
    const count = prepared.filtered.length;
    const open = detailsOn() ? identityIndices(count).filter(detailed) : [];

    if (open.length === 0) {
      return identityRefs(count);
    }
    const refs = new Int32Array(count + open.length);
    let next = 0;
    let target = 0;

    for (let position = 0; position < count; position += 1) {
      refs[target] = position;
      target += 1;

      if (open[next] === position) {
        refs[target] = DETAIL_REF + position;
        target += 1;
        next += 1;
      }
    }
    return refs;
  };

  const flattenGroups = (): Int32Array => {
    const groups = prepared.groups?.groups ?? [];

    if (prepared.groupDepth === 0) {
      return flattenRows();
    }
    const detailing = detailsOn();
    const rows = prepared.filtered.length;
    const refs = new Int32Array(groups.length + (detailing ? 2 * rows : rows));
    const hidden: boolean[] = [];
    let size = 0;

    groups.forEach((group, index) => {
      hidden.length = group.level;
      const shown = !hidden.includes(true);
      const expanded = isExpanded(group.id);
      hidden.push(!expanded);

      if (!shown) {
        return;
      }
      refs[size] = -(index + 1);
      size += 1;

      if (expanded && group.level === prepared.groupDepth - 1) {
        for (let position = group.start; position < group.end; position += 1) {
          refs[size] = position;
          size += 1;

          if (detailing && detailed(position)) {
            refs[size] = DETAIL_REF + position;
            size += 1;
          }
        }
      }
    });

    return refs.subarray(0, size);
  };

  const refresh = (): void => {
    if (prepared.tree !== null) {
      const walk = walkTree(prepared.tree, (index) => isExpanded(idOf(index)));
      prepared = { ...prepared, filtered: walk.all };
      visible = walk.visible;
      details = NO_DETAILS;
      return;
    }
    visible = flattenGroups();
    details = detailsOn() ? detailPositions(visible) : NO_DETAILS;
  };

  const rowNode = (
    index: number,
    level: number,
    tree: TreeLists | null,
  ): TableNode<T> | undefined => {
    const row = table.rows[index];

    if (row === undefined) {
      return undefined;
    }
    const unloaded = tree !== null && unloadedRow(row);

    const expandable =
      tree === null
        ? options.detail?.(row) === true
        : childrenOf(tree, index).length > 0 || unloaded;

    const id = idOf(index);

    return {
      kind: 'row',
      id,
      index,
      row,
      level,
      expandable,
      expanded: expandable && isExpanded(id),
      unloaded,
      loading: false,
    };
  };

  const detailNode = (position: number): TableNode<T> | undefined => {
    const index = prepared.filtered[position];
    const row = index === undefined ? undefined : table.rows[index];

    return index === undefined || row === undefined
      ? undefined
      : { kind: 'detail', id: idOf(index), row, level: prepared.groupDepth + 1 };
  };

  const siblingsAt = (position: number): TableSiblings<T> | undefined => {
    const ref = visible[position];

    if (ref === undefined || ref < 0 || ref >= DETAIL_REF) {
      return undefined;
    }
    if (prepared.tree === null) {
      return prepared.filtered[ref] === undefined
        ? undefined
        : { index: ref, count: prepared.filtered.length, parentIndex: -1, parent: undefined };
    }
    const parentIndex = table.parents[ref] ?? -1;
    const siblings = childrenOf(prepared.tree, parentIndex < 0 ? prepared.tree.root : parentIndex);

    return {
      index: siblings.indexOf(ref),
      count: siblings.length,
      parentIndex,
      parent: parentIndex < 0 ? undefined : table.rows[parentIndex],
    };
  };

  const nodeAt = (position: number): TableNode<T> | undefined => {
    const ref = visible[position];

    if (ref === undefined) {
      return undefined;
    }
    if (prepared.tree !== null) {
      return rowNode(ref, table.depths[ref] ?? 0, prepared.tree);
    }
    if (ref >= DETAIL_REF) {
      return detailNode(ref - DETAIL_REF);
    }
    if (ref >= 0) {
      const index = prepared.filtered[ref];
      return index === undefined ? undefined : rowNode(index, prepared.groupDepth, null);
    }
    const group = prepared.groups?.groups[-ref - 1];

    if (group === undefined) {
      return undefined;
    }
    return {
      kind: 'group',
      id: group.id,
      key: group.key,
      value: group.value,
      path: group.path,
      level: group.level,
      count: group.end - group.start,
      expanded: isExpanded(group.id),
      aggregates: group.aggregates,
    };
  };

  const sourceIndexAt = (position: number): number | undefined => {
    const ref = visible[position];

    if (ref === undefined || ref < 0 || ref >= DETAIL_REF) {
      return undefined;
    }
    return prepared.tree === null ? prepared.filtered[ref] : ref;
  };

  const positionsOf = (
    matches: (id: TableNodeId) => boolean,
    limit: number,
  ): TableNodePosition[] => {
    const found: TableNodePosition[] = [];

    for (let position = 0; position < visible.length && found.length < limit; position += 1) {
      const index = sourceIndexAt(position);
      const id = index === undefined ? undefined : idOf(index);

      if (id !== undefined && matches(id)) {
        found.push([id, position]);
      }
    }
    return found;
  };

  const setExpanded = (id: TableNodeId, expanded: boolean): void => {
    if (expanded === defaultExpanded) {
      toggled.delete(id);
    } else {
      toggled.add(id);
    }
    refresh();
  };

  const distinctStage = (
    column: TableEngineColumn<T>,
    limit: number,
    finish: (found: TableDistinct) => void,
  ): PipelineStage | null => {
    const store = stores.get(column.key);

    switch (store?.kind) {
      case undefined:
        finish({ values: [], truncated: false });
        return null;
      case ColumnStoreKind.Codes:
        throw new Error(`Table engine lists values of "${column.key}" only from a ranked store`);
      case ColumnStoreKind.String:
        finish(distinctStrings(store, limit));
        return null;
      case ColumnStoreKind.Number: {
        const job = createDistinctNumbersJob(column, store, limit);

        return {
          phase: 'keys',
          job,
          next: () => {
            finish(job.result());
            return null;
          },
        };
      }
    }
  };

  const runSync = (query: TableQuery): TableRunResult => {
    generation += 1;
    const outcome: { prepared: Prepared | null } = { prepared: null };

    const pipeline = pipelineFor(planOf(query), (next) => {
      outcome.prepared = next;
    });

    pipeline?.work(Number.POSITIVE_INFINITY);
    return commit(outcome.prepared);
  };

  const regroup = (plan: Plan<T>): void => {
    const outcome: { prepared: Prepared | null } = { prepared: null };
    const filtered = prepared.filtered;

    const pipeline = createPipeline(
      storesStage(plan.needs, () =>
        groupStage(plan, filtered, (next) => {
          outcome.prepared = next;
        }),
      ),
    );

    pipeline?.work(Number.POSITIVE_INFINITY);

    if (outcome.prepared !== null) {
      commit(outcome.prepared);
    }
  };

  const patch = (query: TableQuery, keys: readonly string[]): void => {
    const changed = new Set(keys);

    for (const key of changed) {
      forget(key);
    }
    rowsVersion += 1;

    if (options.children !== undefined || prepared.groups === null) {
      return;
    }
    const plan = planOf(query);

    if (plan.groupBy.some((key) => changed.has(key))) {
      runSync(query);
      return;
    }
    for (const column of plan.aggregates) {
      forget(column.key);
    }
    regroup(plan);
  };

  return {
    count: () => visible.length,
    rowCount: () => prepared.filtered.length,
    setRows: (next) => {
      table =
        options.children === undefined
          ? { rows: next, parents: new Int32Array(0), depths: new Uint16Array(0) }
          : flattenTree(next, options.children);

      stores = new Map();
      dropBuilding();
      generation += 1;
      rowsVersion += 1;
      toggled.clear();

      prepared = {
        filtered: identityIndices(table.rows.length),
        groups: null,
        tree:
          options.children === undefined
            ? null
            : buildTreeLists(allPass(table.rows.length), table.parents),
        groupDepth: 0,
      };

      refresh();
    },
    run: (query, runOptions = {}) => {
      generation += 1;
      const mine = generation;

      const attempt = async (): Promise<TableRunResult> => {
        const version = rowsVersion;
        const outcome: { prepared: Prepared | null } = { prepared: null };

        const pipeline = pipelineFor(
          planOf(query),
          (next) => {
            outcome.prepared = next;
          },
          runOptions,
        );

        const completed =
          pipeline === null ||
          (await runSliced(pipeline, {
            sliceMs,
            yieldTo: runOptions.yieldTo ?? yieldTo,
            signal: runOptions.signal,
            isStale: () => mine !== generation || version !== rowsVersion,
            onProgress: (done, total) => {
              runOptions.onProgress?.({ phase: pipeline.phase(), done, total });
            },
          }));

        if (mine === generation && version !== rowsVersion && runOptions.signal?.aborted !== true) {
          return attempt();
        }
        return commit(completed && mine === generation ? outcome.prepared : null);
      };

      return attempt();
    },
    runSync,
    patch,
    prepare: async (wishes, prepareOptions = {}) => {
      const version = rowsVersion;

      const slicing = {
        sliceMs: prepareOptions.sliceMs ?? sliceMs,
        yieldTo: prepareOptions.yieldTo ?? yieldTo,
        signal: prepareOptions.signal,
        isStale: () => version !== rowsVersion,
      };

      for (const wish of wishes) {
        const storing = columns.has(wish.key) ? storesJob([[wish.key, wish.need]]) : null;

        if (storing !== null && !(await runSliced(storing, slicing))) {
          return false;
        }

        const finishing = columns.has(wish.key) ? finishingJob(wish) : null;

        if (finishing !== null && !(await runSliced(finishing, slicing))) {
          return false;
        }
      }
      return true;
    },
    visibleIndices: () => prepared.filtered,
    nodeAt,
    positionsOf,
    details: () => details,
    siblingsAt,
    rowAt: (index) => table.rows[index],
    toggle: (position) => {
      const node = nodeAt(position);

      if (
        node === undefined ||
        node.kind === TableNodeKind.Detail ||
        (node.kind === TableNodeKind.Row && !node.expandable)
      ) {
        return;
      }
      setExpanded(node.id, !node.expanded);
    },
    setExpanded,
    setToggled: (ids) => {
      toggled.clear();

      for (const id of ids) {
        toggled.add(id);
      }
      refresh();
    },
    isExpanded,
    totals: () => prepared.groups?.totals ?? {},
    distinct: async (key, distinctOptions = {}) => {
      const version = rowsVersion;
      const limit = distinctOptions.limit ?? DEFAULT_DISTINCT_LIMIT;
      const column = columnOf(key);
      const outcome: { found: TableDistinct | null } = { found: null };

      if (distinctOptions.signal?.aborted === true) {
        return null;
      }

      const pipeline = createPipeline(
        storesStage(new Map([[column.key, 'ranks']]), () =>
          distinctStage(column, limit, (found) => {
            outcome.found = found;
          }),
        ),
      );

      const built =
        pipeline === null ||
        (await runSliced(pipeline, {
          sliceMs,
          yieldTo,
          signal: distinctOptions.signal,
          isStale: () => version !== rowsVersion,
        }));

      return built && version === rowsVersion ? outcome.found : null;
    },
    store: (key) => stores.get(key),
    pendingAt: () => false,
    collect: (signal) => {
      signal?.throwIfAborted();
      return Promise.resolve(
        Array.from(prepared.filtered, (index) => table.rows[index]).filter(isDefined),
      );
    },
    ensure: () => undefined,
    refresh: () => undefined,
    settled: () => true,
    dispose: () => {
      generation += 1;
      rowsVersion += 1;
      table = { rows: [], parents: new Int32Array(0), depths: new Uint16Array(0) };
      stores = new Map();
      dropBuilding();
      prepared = emptyPrepared();
      visible = new Int32Array(0);
      toggled.clear();
    },
  };
};
