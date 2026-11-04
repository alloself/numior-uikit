import { CellValueKind, type CellValue } from '../cell.types';
import { EMPTY, errorValue, numberValue } from '../values';
import { PivotAggregate } from './pivot.types';

export interface PivotAccumulator {
  filled: number;
  numbers: number;
  sum: number;
  product: number;
  mean: number;
  squares: number;
  min: number;
  max: number;
  error: CellValue | undefined;
}

const DIVIDE_BY_ZERO = errorValue('#DIV/0!');

export const createPivotAccumulator = (): PivotAccumulator => ({
  filled: 0,
  numbers: 0,
  sum: 0,
  product: 1,
  mean: 0,
  squares: 0,
  min: Number.POSITIVE_INFINITY,
  max: Number.NEGATIVE_INFINITY,
  error: undefined,
});

export const accumulatePivot = (target: PivotAccumulator, value: CellValue): void => {
  if (value.kind === CellValueKind.Empty) {
    return;
  }

  target.filled += 1;
  if (value.kind === CellValueKind.Error) {
    target.error ??= value;
    return;
  }
  if (value.kind !== CellValueKind.Number) {
    return;
  }

  const delta = value.value - target.mean;

  target.numbers += 1;
  target.sum += value.value;
  target.product *= value.value;
  target.mean += delta / target.numbers;
  target.squares += delta * (value.value - target.mean);
  target.min = Math.min(target.min, value.value);
  target.max = Math.max(target.max, value.value);
};

export const mergePivot = (target: PivotAccumulator, source: PivotAccumulator): void => {
  const total = target.numbers + source.numbers;

  target.filled += source.filled;
  target.error ??= source.error;
  if (source.numbers === 0) {
    return;
  }

  const delta = source.mean - target.mean;

  target.squares += source.squares + (delta * delta * target.numbers * source.numbers) / total;
  target.mean += (delta * source.numbers) / total;
  target.numbers = total;
  target.sum += source.sum;
  target.product *= source.product;
  target.min = Math.min(target.min, source.min);
  target.max = Math.max(target.max, source.max);
};

const spread = (source: PivotAccumulator, sample: boolean, root: boolean): CellValue => {
  const count = sample ? source.numbers - 1 : source.numbers;

  if (count <= 0) {
    return DIVIDE_BY_ZERO;
  }

  const variance = source.squares / count;

  return numberValue(root ? Math.sqrt(variance) : variance);
};

const NUMERIC: Readonly<
  Record<Exclude<PivotAggregate, 'count' | 'countNums'>, (source: PivotAccumulator) => CellValue>
> = {
  sum: (source) => numberValue(source.sum),
  average: (source) =>
    source.numbers === 0 ? DIVIDE_BY_ZERO : numberValue(source.sum / source.numbers),
  max: (source) => numberValue(source.numbers === 0 ? 0 : source.max),
  min: (source) => numberValue(source.numbers === 0 ? 0 : source.min),
  product: (source) => numberValue(source.numbers === 0 ? 0 : source.product),
  stdDev: (source) => spread(source, true, true),
  stdDevp: (source) => spread(source, false, true),
  var: (source) => spread(source, true, false),
  varp: (source) => spread(source, false, false),
};

export const finishPivot = (aggregate: PivotAggregate, source: PivotAccumulator): CellValue => {
  if (source.filled === 0) {
    return EMPTY;
  }
  if (aggregate === PivotAggregate.Count) {
    return numberValue(source.filled);
  }
  if (aggregate === PivotAggregate.CountNums) {
    return numberValue(source.numbers);
  }
  return source.error ?? NUMERIC[aggregate](source);
};
