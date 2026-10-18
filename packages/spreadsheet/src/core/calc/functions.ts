import type { CellValue } from '../cell.types';
import type { EvalValue, FunctionArgs, FunctionSpec } from './calc.types';
import { compareValues, raise } from './coerce';
import { ARRAY_FUNCTIONS } from './array-functions';
import { scalarOf } from './evaluate';
import { INFORMATION_FUNCTIONS } from './information-functions';
import { LOGICAL_FUNCTIONS } from './logical-functions';
import { MATH_FUNCTIONS } from './math-functions';
import { defineFunction } from './registry';
import { STATISTICS_FUNCTIONS } from './statistics-functions';
import { TEXT_FUNCTIONS } from './text-functions';
import { VOLATILE_FUNCTIONS } from './volatile-functions';

interface Grid {
  readonly rows: number;
  readonly cols: number;
  at(row: number, col: number): CellValue;
}

const gridOf = (value: EvalValue): Grid => {
  switch (value.kind) {
    case 'reference': {
      const { sheet, range } = value;

      return {
        rows: range.bottom - range.top + 1,
        cols: range.right - range.left + 1,
        at: (row, col) => sheet.cells.get(range.top + row, range.left + col),
      };
    }
    case 'array':
      return {
        rows: value.rows.length,
        cols: value.rows[0]?.length ?? 0,
        at: (row, col) => value.rows[row]?.[col] ?? { kind: 'empty' },
      };
    case 'error':
      return raise(value.code);
    default:
      return { rows: 1, cols: 1, at: () => scalarOf(value) };
  }
};

const approximateRow = (grid: Grid, wanted: CellValue): number | undefined => {
  let low = 0;
  let high = grid.rows - 1;
  let found: number | undefined;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const key = grid.at(middle, 0);

    if (key.kind !== 'empty' && compareValues(key, wanted) <= 0) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
};

const exactRow = (args: FunctionArgs, table: EvalValue, wanted: CellValue): number | undefined => {
  if (table.kind === 'reference') {
    return args.lookup(table, 0, wanted);
  }
  const grid = gridOf(table);

  for (let row = 0; row < grid.rows; row += 1) {
    const key = grid.at(row, 0);

    if (key.kind === wanted.kind && compareValues(key, wanted) === 0) {
      return row;
    }
  }
  return undefined;
};

const vlookup = (args: FunctionArgs): EvalValue => {
  const wanted = args.scalar(0);
  const table = args.value(1);
  const column = Math.trunc(args.number(2));
  const grid = gridOf(table);

  if (wanted.kind === 'error') {
    return raise(wanted.code);
  }
  if (column < 1) {
    return raise('#VALUE!');
  }
  if (column > grid.cols) {
    return raise('#REF!');
  }
  const row = args.logical(3, true) ? approximateRow(grid, wanted) : exactRow(args, table, wanted);

  return row === undefined ? raise('#N/A') : grid.at(row, column - 1);
};

export const BASE_FUNCTIONS: readonly FunctionSpec[] = [
  ...MATH_FUNCTIONS,
  ...STATISTICS_FUNCTIONS,
  ...LOGICAL_FUNCTIONS,
  ...TEXT_FUNCTIONS,
  ...INFORMATION_FUNCTIONS,
  defineFunction({ name: 'VLOOKUP', min: 3, max: 4, lift: [0], evaluate: vlookup }),
  ...ARRAY_FUNCTIONS,
  ...VOLATILE_FUNCTIONS,
];
