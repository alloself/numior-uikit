import type { ColumnStore, GridAggregateKind } from './engine.types';

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

export const accumulate = (target: Accumulator, store: ColumnStore, index: number): void => {
  target.count += 1;

  if (store.kind !== 'number' || store.nulls[index] === 1) {
    return;
  }
  const key = store.keys[index] ?? 0;
  target.filled += 1;
  target.sum += key;
  target.min = Math.min(target.min, key);
  target.max = Math.max(target.max, key);
};

export const finishAggregate = (kind: GridAggregateKind, source: Accumulator): unknown => {
  switch (kind) {
    case 'count':
      return source.count;
    case 'sum':
      return source.sum;
    case 'avg':
      return source.filled === 0 ? null : source.sum / source.filled;
    case 'min':
      return source.filled === 0 ? null : source.min;
    case 'max':
      return source.filled === 0 ? null : source.max;
  }
};
