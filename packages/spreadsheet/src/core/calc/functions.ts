import type { CellValue } from '../cell.types';
import { booleanValue, numberValue } from '../values';
import type { EvalValue, FunctionArgs, FunctionSpec } from './calc.types';
import { compareValues, numberFromText, raise, toLogical, toNumber } from './coerce';
import { ARRAY_FUNCTIONS } from './array-functions';
import { scalarOf } from './evaluate';
import { defineFunction } from './registry';
import { VOLATILE_FUNCTIONS } from './volatile-functions';

interface Grid {
  readonly rows: number;
  readonly cols: number;
  at(row: number, col: number): CellValue;
}

const MANY = 255;

const eachNumber = (args: FunctionArgs, visit: (value: number) => void): void => {
  args.forEachValue(0, (value, direct) => {
    if (value.kind === 'error') {
      raise(value.code);
    }
    if (value.kind === 'number') {
      visit(value.value);
    } else if (direct) {
      visit(toNumber(value));
    }
  });
};

const counts = (value: CellValue, direct: boolean): boolean => {
  switch (value.kind) {
    case 'number':
      return true;
    case 'boolean':
    case 'empty':
      return direct;
    case 'string':
      return direct && numberFromText(value.value) !== undefined;
    default:
      return false;
  }
};

const extreme =
  (pick: (left: number, right: number) => number) =>
  (args: FunctionArgs): EvalValue => {
    let found: number | undefined;

    eachNumber(args, (value) => {
      found = found === undefined ? value : pick(found, value);
    });

    return numberValue(found ?? 0);
  };

const logicalFold =
  (all: boolean) =>
  (args: FunctionArgs): EvalValue => {
    let seen = false;
    let result = all;

    args.forEachValue(0, (value, direct) => {
      if (value.kind === 'error') {
        raise(value.code);
      }
      if (direct || value.kind === 'number' || value.kind === 'boolean') {
        const truth = toLogical(value);

        seen = true;
        result = all ? result && truth : result || truth;
      }
    });

    return seen ? booleanValue(result) : raise('#VALUE!');
  };

const roundHalfAway = (value: number, digits: number): number => {
  const factor = 10 ** Math.trunc(digits);
  const scaled = Number((Math.abs(value) * factor).toPrecision(15));

  return (Math.sign(value) * Math.round(scaled)) / factor;
};

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
  defineFunction({
    name: 'SUM',
    min: 1,
    max: MANY,
    evaluate: (args) => {
      let total = 0;

      eachNumber(args, (value) => {
        total += value;
      });

      return numberValue(total);
    },
  }),
  defineFunction({
    name: 'AVERAGE',
    min: 1,
    max: MANY,
    evaluate: (args) => {
      let total = 0;
      let count = 0;

      eachNumber(args, (value) => {
        total += value;
        count += 1;
      });

      return count === 0 ? raise('#DIV/0!') : numberValue(total / count);
    },
  }),
  defineFunction({ name: 'MIN', min: 1, max: MANY, evaluate: extreme(Math.min) }),
  defineFunction({ name: 'MAX', min: 1, max: MANY, evaluate: extreme(Math.max) }),
  defineFunction({
    name: 'COUNT',
    min: 1,
    max: MANY,
    evaluate: (args) => {
      let count = 0;

      args.forEachValue(0, (value, direct) => {
        count += Number(counts(value, direct));
      });

      return numberValue(count);
    },
  }),
  defineFunction({
    name: 'COUNTA',
    min: 1,
    max: MANY,
    evaluate: (args) => {
      let count = 0;

      args.forEachValue(0, () => {
        count += 1;
      });

      return numberValue(count);
    },
  }),
  defineFunction({
    name: 'ABS',
    min: 1,
    max: 1,
    lift: [0],
    evaluate: (args) => numberValue(Math.abs(args.number(0))),
  }),
  defineFunction({
    name: 'ROUND',
    min: 2,
    max: 2,
    lift: [0, 1],
    evaluate: (args) => numberValue(roundHalfAway(args.number(0), args.number(1))),
  }),
  defineFunction({
    name: 'IF',
    min: 2,
    max: 3,
    lift: [0],
    broadcast: [0, 1, 2],
    evaluate: (args) => {
      if (args.logical(0)) {
        return args.value(1);
      }
      return args.count > 2 ? args.value(2) : booleanValue(false);
    },
  }),
  defineFunction({ name: 'AND', min: 1, max: MANY, evaluate: logicalFold(true) }),
  defineFunction({ name: 'OR', min: 1, max: MANY, evaluate: logicalFold(false) }),
  defineFunction({
    name: 'NOT',
    min: 1,
    max: 1,
    lift: [0],
    evaluate: (args) => booleanValue(!args.logical(0)),
  }),
  defineFunction({
    name: 'IFERROR',
    min: 2,
    max: 2,
    lift: [0],
    broadcast: [0, 1],
    evaluate: (args) => (args.scalar(0).kind === 'error' ? args.value(1) : args.value(0)),
  }),
  defineFunction({ name: 'VLOOKUP', min: 3, max: 4, lift: [0], evaluate: vlookup }),
  ...ARRAY_FUNCTIONS,
  ...VOLATILE_FUNCTIONS,
];
