import { createStoreJob } from './column-store';
import { runSliced, yieldToHost } from './slicer';
import { createSortJob, identityIndices } from './sort';
import type {
  ColumnStore,
  GridEngine,
  GridEngineColumn,
  GridEngineOptions,
  GridPhase,
  GridRunOptions,
  GridSort,
} from './engine.types';

interface SortLane {
  readonly keys: Float64Array | Uint32Array;
  readonly nulls: Uint8Array;
  readonly sign: 1 | -1;
}

const DEFAULT_SLICE_MS = 12;

const laneOf = (store: ColumnStore, sort: GridSort): SortLane => ({
  keys: store.kind === 'number' ? store.keys : store.ranks,
  nulls: store.nulls,
  sign: sort.direction === 'asc' ? 1 : -1,
});

const compareLane = (lane: SortLane, a: number, b: number): number => {
  const nullA = lane.nulls[a] === 1;
  const nullB = lane.nulls[b] === 1;

  if (nullA || nullB) {
    return nullA === nullB ? 0 : nullA ? 1 : -1;
  }
  const keyA = lane.keys[a] ?? 0;
  const keyB = lane.keys[b] ?? 0;

  if (keyA === keyB) {
    return 0;
  }
  return keyA < keyB ? -lane.sign : lane.sign;
};

const compareLanes = (lanes: readonly SortLane[], a: number, b: number): number => {
  for (const lane of lanes) {
    const order = compareLane(lane, a, b);

    if (order !== 0) {
      return order;
    }
  }
  return 0;
};

export const createGridEngine = <T>(options: GridEngineOptions<T>): GridEngine<T> => {
  const columns = new Map<string, GridEngineColumn<T>>(
    options.columns.map((column) => [column.key, column]),
  );

  const collator = options.collator ?? new Intl.Collator(undefined, { numeric: true });
  const sliceMs = options.sliceMs ?? DEFAULT_SLICE_MS;
  const yieldTo = options.yieldTo ?? yieldToHost;
  let rows: readonly T[] = [];
  let stores = new Map<string, ColumnStore>();
  let visible: Uint32Array = new Uint32Array(0);
  let generation = 0;

  const columnOf = (key: string): GridEngineColumn<T> => {
    const column = columns.get(key);

    if (column === undefined) {
      throw new Error(`Grid engine has no column "${key}"`);
    }
    return column;
  };

  const slicing = (
    mine: number,
    runOptions: GridRunOptions,
    phase: GridPhase,
    offset: number,
    total: number,
  ) => ({
    sliceMs,
    yieldTo,
    signal: runOptions.signal,
    isStale: () => mine !== generation,
    onProgress: (done: number, jobTotal: number) => {
      runOptions.onProgress?.({
        phase,
        done: Math.min(offset + done, total),
        total: Math.max(total, jobTotal),
      });
    },
  });

  const buildStores = async (
    keys: readonly string[],
    mine: number,
    runOptions: GridRunOptions,
  ): Promise<boolean> => {
    const pending = keys.filter((key) => !stores.has(key));
    const total = pending.length * rows.length;
    let offset = 0;

    for (const key of pending) {
      const job = createStoreJob(columnOf(key), rows, collator);

      if (!(await runSliced(job, slicing(mine, runOptions, 'keys', offset, total)))) {
        return false;
      }
      stores.set(key, job.result());
      offset += rows.length;
    }
    return true;
  };

  return {
    count: () => visible.length,
    setRows: (next) => {
      rows = next;
      stores = new Map();
      visible = identityIndices(rows.length);
      generation += 1;
    },
    run: async (query, runOptions = {}) => {
      generation += 1;
      const mine = generation;
      const keys = [...new Set(query.sort.map((sort) => sort.key))];

      for (const key of keys) {
        columnOf(key);
      }
      if (!(await buildStores(keys, mine, runOptions))) {
        return { kind: 'cancelled' };
      }
      const indices = identityIndices(rows.length);

      const lanes = query.sort.flatMap((sort) => {
        const store = stores.get(sort.key);
        return store === undefined ? [] : [laneOf(store, sort)];
      });

      if (lanes.length > 0) {
        const job = createSortJob(indices, (a, b) => compareLanes(lanes, a, b));

        if (!(await runSliced(job, slicing(mine, runOptions, 'sort', 0, job.total())))) {
          return { kind: 'cancelled' };
        }
      }
      if (mine !== generation) {
        return { kind: 'cancelled' };
      }
      visible = indices;
      return { kind: 'done', count: indices.length };
    },
    visibleIndices: () => visible,
    nodeAt: (position) => {
      const index = visible[position];
      const row = index === undefined ? undefined : rows[index];

      return index === undefined || row === undefined
        ? undefined
        : { kind: 'row', index, row, level: 0 };
    },
    store: (key) => stores.get(key),
    dispose: () => {
      generation += 1;
      rows = [];
      stores = new Map();
      visible = new Uint32Array(0);
    },
  };
};
