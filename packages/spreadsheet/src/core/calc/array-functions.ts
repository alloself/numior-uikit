import { MAX_COLS, MAX_ROWS } from '../address';
import { numberValue } from '../values';
import { buildArray, type Shape } from './array';
import type { FunctionSpec } from './calc.types';
import { raise } from './coerce';
import { defineFunction } from './registry';

const MAX_ITEMS = 10_000_000;

export const arrayShape = (rows: number, cols: number): Shape => {
  const height = Math.trunc(rows);
  const width = Math.trunc(cols);

  if (height < 1 || width < 1) {
    return raise('#CALC!');
  }
  if (height > MAX_ROWS || width > MAX_COLS || height * width > MAX_ITEMS) {
    return raise('#NUM!');
  }
  return { rows: height, cols: width };
};

export const ARRAY_FUNCTIONS: readonly FunctionSpec[] = [
  defineFunction({
    name: 'SEQUENCE',
    min: 1,
    max: 4,
    evaluate: (args) => {
      const shape = arrayShape(args.number(0), args.number(1, 1));
      const start = args.number(2, 1);
      const step = args.number(3, 1);

      return buildArray(shape, (row, col) => numberValue(start + (row * shape.cols + col) * step));
    },
  }),
  defineFunction({
    name: 'TRANSPOSE',
    min: 1,
    max: 1,
    evaluate: (args) => {
      const matrix = args.matrix(0);
      const shape = { rows: matrix[0]?.length ?? 0, cols: matrix.length };

      return buildArray(shape, (row, col) => matrix[col]?.[row] ?? { kind: 'empty' });
    },
  }),
];
