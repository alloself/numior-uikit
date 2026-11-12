import { ColumnStoreKind, TableAggregateKind, type ColumnStore } from './engine.types';

export interface Accumulator {
  count: number;
  filled: number;
  sum: number;
  min: number;
  max: number;
}

export const createAccumulator = (): Accumulator => ({
  count: 0,
  filled: 0,
  sum: 0,
  min: Number.POSITIVE_INFINITY,
  max: Number.NEGATIVE_INFINITY,
});

export const accumulateRange = (
  target: Accumulator,
  store: ColumnStore,
  indices: Uint32Array,
  from: number,
  to: number,
  countOnly = false,
): void => {
  target.count += to - from;

  if (store.kind !== ColumnStoreKind.Number || countOnly) {
    return;
  }
  const { keys, nulls } = store;
  let { filled, sum, min, max } = target;

  for (let position = from; position < to; position += 1) {
    const index = indices[position] ?? 0;

    if (nulls[index] === 1) {
      continue;
    }

    const key = keys[index] ?? 0;
    filled += 1;
    sum += key;
    min = key < min ? key : min;
    max = key > max ? key : max;
  }
  target.filled = filled;
  target.sum = sum;
  target.min = min;
  target.max = max;
};

export const mergeAccumulator = (target: Accumulator, source: Accumulator): void => {
  target.count += source.count;
  target.filled += source.filled;
  target.sum += source.sum;
  target.min = Math.min(target.min, source.min);
  target.max = Math.max(target.max, source.max);
};

export const finishAggregate = (kind: TableAggregateKind, source: Accumulator): unknown => {
  switch (kind) {
    case TableAggregateKind.Count:
      return source.count;
    case TableAggregateKind.Sum:
      return source.sum;
    case TableAggregateKind.Avg:
      return source.filled === 0 ? null : source.sum / source.filled;
    case TableAggregateKind.Min:
      return source.filled === 0 ? null : source.min;
    case TableAggregateKind.Max:
      return source.filled === 0 ? null : source.max;
  }
};
