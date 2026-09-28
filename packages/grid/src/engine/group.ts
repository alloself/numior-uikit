import { accumulate, createAccumulator, finishAggregate, type Accumulator } from './aggregate';
import { CHECK_INTERVAL, type SliceJob } from './slicer';
import type { ColumnStore, GridAggregate, GridEngineColumn } from './engine.types';

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
  readonly aggregate: GridAggregate<T>;
}

export interface GroupLevel<T> {
  readonly column: GridEngineColumn<T>;
  readonly store: ColumnStore;
}

export interface GroupJob extends SliceJob {
  result(): GroupTable;
}

interface OpenGroup {
  readonly token: number;
  readonly value: unknown;
  readonly path: readonly unknown[];
  readonly id: string;
  readonly start: number;
  readonly accumulators: readonly Accumulator[];
}

const tokenOf = (store: ColumnStore, index: number): number => {
  if (store.nulls[index] === 1) {
    return Number.NaN;
  }
  return store.kind === 'number' ? (store.keys[index] ?? 0) : (store.codes[index] ?? 0);
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
  let position = 0;

  const close = (level: number, end: number): void => {
    const group = open[level];

    if (group === undefined) {
      return;
    }
    const levelColumn = levels[level];

    groups.push({
      id: group.id,
      key: levelColumn?.column.key ?? '',
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
        token: tokenOf(current.store, rowIndex),
        value,
        path,
        id: JSON.stringify(path),
        start,
        accumulators: aggregates.map(() => createAccumulator()),
      });
    }
  };

  const firstChange = (rowIndex: number): number => {
    for (let depth = 0; depth < levels.length; depth += 1) {
      const current = levels[depth];
      const group = open[depth];

      if (current === undefined || group === undefined) {
        return depth;
      }
      if (!Object.is(group.token, tokenOf(current.store, rowIndex))) {
        return depth;
      }
    }
    return levels.length;
  };

  const step = (): void => {
    const rowIndex = sorted[position] ?? 0;
    const change = firstChange(rowIndex);

    if (change < levels.length) {
      closeFrom(change, position);
      openFrom(change, rowIndex, position);
    }

    aggregates.forEach((column, index) => {
      accumulate(totals[index] ?? createAccumulator(), column.store, rowIndex);

      for (const group of open) {
        accumulate(group.accumulators[index] ?? createAccumulator(), column.store, rowIndex);
      }
    });

    position += 1;
  };

  return {
    total: () => sorted.length,
    done: () => position,
    work: (deadline) => {
      while (position < sorted.length) {
        step();

        if (position % CHECK_INTERVAL === 0 && performance.now() >= deadline) {
          return false;
        }
      }
      closeFrom(0, sorted.length);
      return true;
    },
    result: () => ({
      groups: groups.toSorted((a, b) => a.start - b.start || a.level - b.level),
      totals: finishAll(aggregates, totals, rows, sorted),
    }),
  };
};
