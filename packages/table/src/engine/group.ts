import {
  accumulateRange,
  createAccumulator,
  finishAggregate,
  mergeAccumulator,
  type Accumulator,
} from './aggregate';
import { CHECK_INTERVAL, type SliceJob } from './slicer';
import {
  ColumnStoreKind,
  TableAggregateKind,
  type ColumnStore,
  type TableAggregate,
  type TableEngineColumn,
} from './engine.types';

export interface GroupRecord {
  readonly id: string;
  readonly key: string;
  readonly value: unknown;
  readonly path: readonly unknown[];
  readonly level: number;
  readonly start: number;
  readonly end: number;
  readonly aggregates: Readonly<Record<string, unknown>>;
}

export interface GroupTable {
  readonly groups: readonly GroupRecord[];
  readonly totals: Readonly<Record<string, unknown>>;
}

export interface AggregateColumn<T> {
  readonly key: string;
  readonly store: ColumnStore;
  readonly aggregate: TableAggregate<T>;
}

export interface GroupLevel<T> {
  readonly column: TableEngineColumn<T>;
  readonly store: ColumnStore;
}

export interface GroupJob extends SliceJob {
  result(): GroupTable;
}

interface OpenGroup {
  readonly row: number;
  readonly value: unknown;
  readonly path: readonly unknown[];
  readonly id: string;
  readonly start: number;
  readonly accumulators: readonly Accumulator[];
}

interface Lane {
  readonly keys: Float64Array | Uint32Array;
  readonly nulls: Uint8Array;
}

const laneOf = (store: ColumnStore): Lane =>
  store.kind === ColumnStoreKind.Number
    ? { keys: store.keys, nulls: store.nulls }
    : { keys: store.codes, nulls: store.nulls };

const sameIn = (lane: Lane, left: number, right: number): boolean => {
  const empty = lane.nulls[left] === 1;

  return empty === (lane.nulls[right] === 1) && (empty || lane.keys[left] === lane.keys[right]);
};

const mergeAll = (into: readonly Accumulator[], from: readonly Accumulator[]): void => {
  from.forEach((source, index) => {
    const target = into[index];

    if (target === undefined) {
      return;
    }

    mergeAccumulator(target, source);
  });
};

const finishAll = <T>(
  columns: readonly AggregateColumn<T>[],
  accumulators: readonly Accumulator[],
  rows: readonly T[],
  indices: Uint32Array,
): Readonly<Record<string, unknown>> => {
  const result: Record<string, unknown> = {};

  columns.forEach((column, position) => {
    const accumulator = accumulators[position] ?? createAccumulator();

    result[column.key] =
      typeof column.aggregate === 'function'
        ? column.aggregate(rows, indices)
        : finishAggregate(column.aggregate, accumulator);
  });

  return result;
};

export const createGroupJob = <T>(
  rows: readonly T[],
  sorted: Uint32Array,
  levels: readonly GroupLevel<T>[],
  aggregates: readonly AggregateColumn<T>[],
): GroupJob => {
  const groups: GroupRecord[] = [];
  const open: OpenGroup[] = [];
  const totals = aggregates.map(() => createAccumulator());
  const lanes = levels.map((level) => laneOf(level.store));
  const length = sorted.length;
  let position = 0;

  const close = (level: number, end: number): void => {
    const group = open[level];

    if (group === undefined) {
      return;
    }
    mergeAll(open[level - 1]?.accumulators ?? totals, group.accumulators);

    groups.push({
      id: group.id,
      key: levels[level]?.column.key ?? '',
      value: group.value,
      path: group.path,
      level,
      start: group.start,
      end,
      aggregates: finishAll(
        aggregates,
        group.accumulators,
        rows,
        sorted.subarray(group.start, end),
      ),
    });
  };

  const closeFrom = (level: number, end: number): void => {
    for (let depth = open.length - 1; depth >= level; depth -= 1) {
      close(depth, end);
      open.pop();
    }
  };

  const openFrom = (level: number, rowIndex: number, start: number): void => {
    const row = rows[rowIndex];

    for (let depth = level; depth < levels.length; depth += 1) {
      const current = levels[depth];

      if (current === undefined || row === undefined) {
        return;
      }
      const value = current.column.value(row);
      const path = [...(open[depth - 1]?.path ?? []), value];

      open.push({
        row: rowIndex,
        value,
        path,
        id: JSON.stringify(path),
        start,
        accumulators: aggregates.map(() => createAccumulator()),
      });
    }
  };

  const firstChange = (rowIndex: number): number => {
    for (let depth = 0; depth < lanes.length; depth += 1) {
      const lane = lanes[depth];
      const group = open[depth];

      if (lane === undefined || group === undefined || !sameIn(lane, group.row, rowIndex)) {
        return depth;
      }
    }
    return lanes.length;
  };

  const sameTuple = (left: number, right: number): boolean => {
    for (const lane of lanes) {
      if (!sameIn(lane, left, right)) {
        return false;
      }
    }
    return true;
  };

  const segmentEnd = (from: number): number => {
    const limit = Math.min(length, from + CHECK_INTERVAL);

    if (lanes.length === 0) {
      return limit;
    }

    const first = sorted[from] ?? 0;
    const inside = (at: number): boolean => sameTuple(first, sorted[at] ?? 0);
    let low = from;
    let step = 1;

    while (low + step < limit && inside(low + step)) {
      low += step;
      step *= 2;
    }

    let high = Math.min(low + step, limit);

    while (low + 1 < high) {
      const middle = (low + high) >> 1;

      if (inside(middle)) {
        low = middle;
      } else {
        high = middle;
      }
    }
    return high;
  };

  const accumulateSegment = (from: number, to: number): void => {
    const targets = open.at(-1)?.accumulators ?? totals;

    aggregates.forEach((column, index) => {
      const target = targets[index];

      if (target === undefined) {
        return;
      }

      accumulateRange(
        target,
        column.store,
        sorted,
        from,
        to,
        column.aggregate === TableAggregateKind.Count,
      );
    });
  };

  return {
    total: () => length,
    done: () => position,
    work: (deadline) => {
      let sinceCheck = 0;

      while (position < length) {
        const rowIndex = sorted[position] ?? 0;
        const change = firstChange(rowIndex);

        if (change < lanes.length) {
          closeFrom(change, position);
          openFrom(change, rowIndex, position);
        }
        const end = segmentEnd(position);
        accumulateSegment(position, end);
        sinceCheck += end - position;
        position = end;

        if (sinceCheck < CHECK_INTERVAL) {
          continue;
        }

        sinceCheck = 0;

        if (performance.now() >= deadline && position < length) {
          return false;
        }
      }
      closeFrom(0, length);
      return true;
    },
    result: () => ({
      groups: groups.toSorted((a, b) => a.start - b.start || a.level - b.level),
      totals: finishAll(aggregates, totals, rows, sorted),
    }),
  };
};
