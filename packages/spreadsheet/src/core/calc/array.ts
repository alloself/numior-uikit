import { maxBy } from 'lodash-es';
import { CellValueKind, type CellValue } from '../cell.types';
import { errorValue, numberValue } from '../values';
import { EvalValueKind, type ArrayValue, type EvalValue } from './calc.types';

export type Matrix = readonly (readonly CellValue[])[];

export interface Shape {
  readonly rows: number;
  readonly cols: number;
}

const MISSING_ITEM = errorValue('#N/A');

export const shapeOf = (value: EvalValue): Shape => {
  switch (value.kind) {
    case EvalValueKind.Reference:
      return {
        rows: value.range.bottom - value.range.top + 1,
        cols: value.range.right - value.range.left + 1,
      };
    case EvalValueKind.Array:
      return { rows: value.rows.length, cols: value.rows[0]?.length ?? 0 };
    default:
      return { rows: 1, cols: 1 };
  }
};

export const isMultiCell = (value: EvalValue): boolean => {
  const { rows, cols } = shapeOf(value);

  return rows * cols > 1;
};

export const matrixOf = (value: EvalValue): Matrix => {
  switch (value.kind) {
    case EvalValueKind.Reference: {
      const { sheet, range } = value;
      const { rows, cols } = shapeOf(value);

      return Array.from({ length: rows }, (_, row) =>
        Array.from({ length: cols }, (_item, col) =>
          sheet.cells.get(range.top + row, range.left + col),
        ),
      );
    }
    case EvalValueKind.Array:
      return value.rows;
    default:
      return [[value]];
  }
};

export const broadcastShape = (shapes: readonly Shape[]): Shape => ({
  rows: Math.max(1, maxBy(shapes, (shape) => shape.rows)?.rows ?? 1),
  cols: Math.max(1, maxBy(shapes, (shape) => shape.cols)?.cols ?? 1),
});

export const elementAt = (matrix: Matrix, row: number, col: number): CellValue => {
  const line = matrix[matrix.length === 1 ? 0 : row];

  if (line === undefined) {
    return MISSING_ITEM;
  }
  return line[line.length === 1 ? 0 : col] ?? MISSING_ITEM;
};

export const buildArray = (
  shape: Shape,
  item: (row: number, col: number) => CellValue,
): ArrayValue => ({
  kind: 'array',
  rows: Array.from({ length: shape.rows }, (_, row) =>
    Array.from({ length: shape.cols }, (_item, col) => item(row, col)),
  ),
});

export const blankAsZero = (value: CellValue): CellValue =>
  value.kind === CellValueKind.Empty ? numberValue(0) : value;
