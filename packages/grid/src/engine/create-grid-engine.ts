import { createStoresJob } from './column-store';
import { compactPass, compileFilter, compileQuick, createFilterJob, type RowTest } from './filter';
import { createGroupJob, type AggregateColumn, type GroupLevel, type GroupTable } from './group';
import { createPipeline, type Pipeline, type PipelineStage } from './pipeline';
import { runSliced, yieldToHost } from './slicer';
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
import type {
  ColumnStore,
  GridDistinct,
  GridEngine,
  GridEngineColumn,
  GridEngineOptions,
  GridFilter,
  GridFilterValue,
  GridNode,
  GridNodeId,
  GridQuery,
  GridRunOptions,
  GridRunResult,
  GridSort,
} from './engine.types';

interface Prepared {
  readonly filtered: Uint32Array;
  readonly groups: GroupTable | null;
  readonly tree: TreeLists | null;
  readonly groupDepth: number;
}

interface Plan<T> {
  readonly sort: readonly GridSort[];
  readonly filters: readonly GridFilter[];
  readonly groupBy: readonly string[];
  readonly aggregates: readonly GridEngineColumn<T>[];
  readonly keys: readonly string[];
}

const DEFAULT_SLICE_MS = 12;
const DEFAULT_DISTINCT_LIMIT = 100;

const isStringStore = (
  store: ColumnStore | undefined,
): store is Extract<ColumnStore, { kind: 'string' }> => store?.kind === 'string';

const emptyPrepared = (): Prepared => ({
  filtered: new Uint32Array(0),
  groups: null,
  tree: null,
  groupDepth: 0,
});

const allPass = (count: number): Uint8Array => new Uint8Array(count).fill(1);

const valueOf = <T>(
  column: GridEngineColumn<T>,
  store: ColumnStore,
  key: number,
): GridFilterValue => {
  switch (column.kind) {
    case 'boolean':
      return key === 1;
    case 'string':
      return store.kind === 'string' ? (store.dictionary[key] ?? null) : null;
    case 'number':
    case 'date':
      return key;
  }
};

const distinctStrings = (
  store: Extract<ColumnStore, { kind: 'string' }>,
  limit: number,
): GridDistinct => {
  const values: GridFilterValue[] = [];

  for (const code of store.sortedCodes.subarray(0, limit)) {
    values.push(store.dictionary[code] ?? '');
  }
  return { values, truncated: store.dictionary.length > limit };
};

export const createGridEngine = <T>(options: GridEngineOptions<T>): GridEngine<T> => {
  const columns = new Map<string, GridEngineColumn<T>>(
    options.columns.map((column) => [column.key, column]),
  );

  const stringKeys = options.columns
    .filter((column) => column.kind === 'string')
    .map((column) => column.key);

  const aggregated = options.columns.filter((column) => column.aggregate !== undefined);
  const collator = options.collator ?? new Intl.Collator(undefined, { numeric: true });
  const sliceMs = options.sliceMs ?? DEFAULT_SLICE_MS;
  const yieldTo = options.yieldTo ?? yieldToHost;
  const defaultExpanded = options.defaultExpanded ?? true;
  let table: TreeTable<T> = { rows: [], parents: new Int32Array(0), depths: new Uint16Array(0) };
  let stores = new Map<string, ColumnStore>();
  let prepared = emptyPrepared();
  let visible: Int32Array = new Int32Array(0);
  let generation = 0;
  let rowsVersion = 0;
  const toggled = new Set<GridNodeId>();

  const columnOf = (key: string): GridEngineColumn<T> => {
    const column = columns.get(key);

    if (column === undefined) {
      throw new Error(`Grid engine has no column "${key}"`);
    }
    return column;
  };

  const idOf = (index: number): GridNodeId => {
    const row = table.rows[index];
    return options.keyOf !== undefined && row !== undefined ? options.keyOf(row) : index;
  };

  const isExpanded = (id: GridNodeId): boolean => defaultExpanded !== toggled.has(id);

  const storesStage = (
    keys: readonly string[],
    next: () => PipelineStage | null,
  ): PipelineStage | null => {
    const pending = keys.filter((key) => !stores.has(key)).map(columnOf);

    if (pending.length === 0) {
      return next();
    }

    const job = createStoresJob(pending, table.rows, collator, (key, store) => {
      stores.set(key, store);
    });

    return { phase: 'keys', job, next };
  };

  const filterKeys = (filter: GridFilter): readonly string[] =>
    filter.kind === 'quick' ? stringKeys : [columnOf(filter.key).key];

  const planOf = (query: GridQuery): Plan<T> => {
    const sort = query.sort ?? [];
    const filters = query.filters ?? [];
    const groupBy = query.groupBy ?? [];

    if (groupBy.length > 0 && options.children !== undefined) {
      throw new Error('Grid engine cannot group rows of a tree');
    }
    const aggregates = groupBy.length > 0 || query.totals === true ? aggregated : [];

    const keys = new Set([
      ...sort.map((entry) => columnOf(entry.key).key),
      ...groupBy.map((key) => columnOf(key).key),
      ...aggregates.map((column) => column.key),
      ...filters.flatMap(filterKeys),
    ]);

    return { sort, filters, groupBy, aggregates, keys: [...keys] };
  };

  const testsOf = (filters: readonly GridFilter[]): RowTest[] =>
    filters.map((filter) =>
      filter.kind === 'quick'
        ? compileQuick(filter.value, stringKeys.map((key) => stores.get(key)).filter(isStringStore))
        : compileFilter(filter, columns.get(filter.key), stores.get(filter.key)),
    );

  const orderKeysOf = (plan: Plan<T>): OrderKey[] => {
    const leading = plan.groupBy.map((key): GridSort => ({ key, direction: 'asc' }));

    return [...leading, ...plan.sort].flatMap((sort) => {
      const store = stores.get(sort.key);
      return store === undefined ? [] : [{ store, descending: sort.direction === 'desc' }];
    });
  };

  const filterStage = (
    plan: Plan<T>,
    next: (pass: Uint8Array) => PipelineStage | null,
  ): PipelineStage | null => {
    if (plan.filters.length === 0) {
      return next(allPass(table.rows.length));
    }
    const job = createFilterJob(table.rows.length, testsOf(plan.filters));

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
    runOptions: GridRunOptions = {},
  ): Pipeline | null =>
    createPipeline(
      storesStage(plan.keys, () =>
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

  const commit = (next: Prepared | null): GridRunResult => {
    if (next === null) {
      return { kind: 'cancelled' };
    }
    prepared = next;
    refresh();
    return { kind: 'done', count: visible.length, rows: prepared.filtered.length };
  };

  const flattenGroups = (): Int32Array => {
    const groups = prepared.groups?.groups ?? [];

    if (prepared.groupDepth === 0) {
      return Int32Array.from(prepared.filtered.keys());
    }
    const refs: number[] = [];
    const hidden: boolean[] = [];

    groups.forEach((group, index) => {
      hidden.length = group.level;
      const shown = !hidden.includes(true);
      const expanded = isExpanded(group.id);
      hidden.push(!expanded);

      if (!shown) {
        return;
      }
      refs.push(-(index + 1));

      if (expanded && group.level === prepared.groupDepth - 1) {
        for (let position = group.start; position < group.end; position += 1) {
          refs.push(position);
        }
      }
    });

    return Int32Array.from(refs);
  };

  const refresh = (): void => {
    if (prepared.tree !== null) {
      const walk = walkTree(prepared.tree, (index) => isExpanded(idOf(index)));
      prepared = { ...prepared, filtered: walk.all };
      visible = walk.visible;
      return;
    }
    visible = flattenGroups();
  };

  const rowNode = (
    index: number,
    level: number,
    tree: TreeLists | null,
  ): GridNode<T> | undefined => {
    const row = table.rows[index];

    if (row === undefined) {
      return undefined;
    }
    const expandable = tree !== null && childrenOf(tree, index).length > 0;
    const id = idOf(index);

    return {
      kind: 'row',
      id,
      index,
      row,
      level,
      expandable,
      expanded: expandable && isExpanded(id),
    };
  };

  const nodeAt = (position: number): GridNode<T> | undefined => {
    const ref = visible[position];

    if (ref === undefined) {
      return undefined;
    }
    if (prepared.tree !== null) {
      return rowNode(ref, table.depths[ref] ?? 0, prepared.tree);
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

  const setExpanded = (id: GridNodeId, expanded: boolean): void => {
    if (expanded === defaultExpanded) {
      toggled.delete(id);
    } else {
      toggled.add(id);
    }
    refresh();
  };

  const distinctNumbers = (
    column: GridEngineColumn<T>,
    store: Extract<ColumnStore, { kind: 'number' }>,
    limit: number,
  ): GridDistinct => {
    const unique = new Set<number>();

    for (let index = 0; index < store.keys.length; index += 1) {
      if (store.nulls[index] !== 1) {
        unique.add(store.keys[index] ?? 0);
      }
    }
    const sorted = [...unique].toSorted((a, b) => a - b).slice(0, limit);

    return {
      values: sorted.map((entry) => valueOf(column, store, entry)),
      truncated: unique.size > limit,
    };
  };

  const distinctOf = (key: string, limit: number): GridDistinct => {
    const column = columnOf(key);
    const store = stores.get(key);

    if (store === undefined) {
      return { values: [], truncated: false };
    }

    const found =
      store.kind === 'string'
        ? distinctStrings(store, limit)
        : distinctNumbers(column, store, limit);

    if (found.truncated || !store.nulls.includes(1)) {
      return found;
    }
    return { values: [...found.values, null], truncated: false };
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
    run: async (query, runOptions = {}) => {
      generation += 1;
      const mine = generation;
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
          yieldTo,
          signal: runOptions.signal,
          isStale: () => mine !== generation,
          onProgress: (done, total) => {
            runOptions.onProgress?.({ phase: pipeline.phase(), done, total });
          },
        }));

      return commit(completed && mine === generation ? outcome.prepared : null);
    },
    runSync: (query) => {
      generation += 1;
      const outcome: { prepared: Prepared | null } = { prepared: null };

      const pipeline = pipelineFor(planOf(query), (next) => {
        outcome.prepared = next;
      });

      pipeline?.work(Number.POSITIVE_INFINITY);
      return commit(outcome.prepared);
    },
    visibleIndices: () => prepared.filtered,
    nodeAt,
    rowAt: (index) => table.rows[index],
    toggle: (position) => {
      const node = nodeAt(position);

      if (node === undefined || (node.kind === 'row' && !node.expandable)) {
        return;
      }
      setExpanded(node.id, !node.expanded);
    },
    setExpanded,
    isExpanded,
    totals: () => prepared.groups?.totals ?? {},
    distinct: async (key, distinctOptions = {}) => {
      const version = rowsVersion;
      const limit = distinctOptions.limit ?? DEFAULT_DISTINCT_LIMIT;
      const pipeline = createPipeline(storesStage([columnOf(key).key], () => null));

      if (distinctOptions.signal?.aborted === true) {
        return null;
      }

      const built =
        pipeline === null ||
        (await runSliced(pipeline, {
          sliceMs,
          yieldTo,
          signal: distinctOptions.signal,
          isStale: () => version !== rowsVersion,
        }));

      return built && version === rowsVersion ? distinctOf(key, limit) : null;
    },
    store: (key) => stores.get(key),
    dispose: () => {
      generation += 1;
      rowsVersion += 1;
      table = { rows: [], parents: new Int32Array(0), depths: new Uint16Array(0) };
      stores = new Map();
      prepared = emptyPrepared();
      visible = new Int32Array(0);
      toggled.clear();
    },
  };
};
