import { CellValueKind, type CellValue } from '../cell.types';
import { EMPTY, numberValue } from '../values';
import { MANY } from './aggregate';
import { buildArray } from './array';
import { EvalValueKind, type EvalValue, type FunctionArgs, type FunctionSpec } from './calc.types';
import { compareExact, raise } from './coerce';
import { wildcardSource } from './criteria';
import { scalarOf } from './evaluate';
import { defineFunction } from './registry';

interface Grid {
  readonly rows: number;
  readonly cols: number;
  at(row: number, col: number): CellValue;
}

interface Vector {
  readonly length: number;
  readonly horizontal: boolean;
  at(index: number): CellValue;
}

type MatchMode = -1 | 0 | 1 | 2;

const WILDCARD = /[*?~]/u;

const gridOf = (value: EvalValue): Grid => {
  switch (value.kind) {
    case EvalValueKind.Reference: {
      const { sheet, range } = value;

      return {
        rows: range.bottom - range.top + 1,
        cols: range.right - range.left + 1,
        at: (row, col) => sheet.cells.get(range.top + row, range.left + col),
      };
    }
    case EvalValueKind.Array:
      return {
        rows: value.rows.length,
        cols: value.rows[0]?.length ?? 0,
        at: (row, col) => value.rows[row]?.[col] ?? EMPTY,
      };
    case EvalValueKind.Error:
      return raise(value.code);
    default:
      return { rows: 1, cols: 1, at: () => scalarOf(value) };
  }
};

const vectorOf = (value: EvalValue): Vector => {
  const grid = gridOf(value);

  if (grid.rows !== 1 && grid.cols !== 1) {
    return raise('#N/A');
  }
  const horizontal = grid.rows === 1 && grid.cols > 1;

  return {
    length: horizontal ? grid.cols : grid.rows,
    horizontal,
    at: (index) => (horizontal ? grid.at(0, index) : grid.at(index, 0)),
  };
};

const comparable = (key: CellValue, wanted: CellValue): boolean =>
  key.kind === wanted.kind && key.kind !== CellValueKind.Error && key.kind !== CellValueKind.Empty;

const patternOf = (wanted: CellValue): RegExp | undefined =>
  wanted.kind === CellValueKind.String && WILDCARD.test(wanted.value)
    ? new RegExp(`^${wildcardSource(wanted.value)}$`, 'iu')
    : undefined;

const equal = (key: CellValue, wanted: CellValue, pattern: RegExp | undefined): boolean => {
  if (!comparable(key, wanted)) {
    return false;
  }
  return pattern !== undefined && key.kind === CellValueKind.String
    ? pattern.test(key.value)
    : compareExact(key, wanted) === 0;
};

const orderOf = (key: CellValue, wanted: CellValue): number | undefined =>
  comparable(key, wanted) ? compareExact(key, wanted) : undefined;

const binary = (vector: Vector, wanted: CellValue, descending: boolean): number | undefined => {
  let low = 0;
  let high = vector.length - 1;
  let found: number | undefined;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const order = orderOf(vector.at(middle), wanted);
    const before = order !== undefined && (descending ? order >= 0 : order <= 0);

    if (before) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
};

const indices = (length: number, reverse: boolean): number[] =>
  Array.from({ length }, (_, index) => (reverse ? length - 1 - index : index));

const closer = (candidate: CellValue, best: CellValue | undefined, side: -1 | 1): boolean =>
  best === undefined || side * compareExact(candidate, best) < 0;

const nearest = (
  vector: Vector,
  wanted: CellValue,
  side: -1 | 1,
  reverse: boolean,
): number | undefined => {
  let found: number | undefined;
  let best: CellValue | undefined;

  for (const index of indices(vector.length, reverse)) {
    const key = vector.at(index);
    const order = orderOf(key, wanted);

    if (order === 0) {
      return index;
    }
    if (order === undefined || Math.sign(order) !== side || !closer(key, best, side)) {
      continue;
    }

    found = index;
    best = key;
  }
  return found;
};

const exact = (
  vector: Vector,
  wanted: CellValue,
  reverse: boolean,
  wildcards: boolean,
): number | undefined => {
  const pattern = wildcards ? patternOf(wanted) : undefined;

  return indices(vector.length, reverse).find((index) => equal(vector.at(index), wanted, pattern));
};

const columnExact = (
  args: FunctionArgs,
  source: EvalValue,
  vector: Vector,
  wanted: CellValue,
  wildcards: boolean,
): number | undefined =>
  source.kind === EvalValueKind.Reference &&
  !vector.horizontal &&
  source.range.left === source.range.right &&
  (!wildcards || patternOf(wanted) === undefined)
    ? args.lookup(source, 0, wanted)
    : exact(vector, wanted, false, wildcards);

const search = (
  args: FunctionArgs,
  source: EvalValue,
  wanted: CellValue,
  mode: MatchMode,
  reverse: boolean,
): number | undefined => {
  const vector = vectorOf(source);

  switch (mode) {
    case -1:
    case 1:
      return nearest(vector, wanted, mode, reverse);
    default:
      return reverse
        ? exact(vector, wanted, true, mode === 2)
        : columnExact(args, source, vector, wanted, mode === 2);
  }
};

const fastExact = (args: FunctionArgs, table: EvalValue, wanted: CellValue): number | undefined =>
  table.kind === EvalValueKind.Reference && patternOf(wanted) === undefined
    ? args.lookup(table, 0, wanted)
    : exact(vectorOf(column(table, 0)), wanted, false, true);

const column = (table: EvalValue, index: number): EvalValue => {
  const grid = gridOf(table);

  return {
    kind: 'array',
    rows: Array.from({ length: grid.rows }, (_, row) => [grid.at(row, index)]),
  };
};

const wantedOf = (args: FunctionArgs): CellValue => {
  const wanted = args.scalar(0);

  return wanted.kind === CellValueKind.Error ? raise(wanted.code) : wanted;
};

const vlookup = (args: FunctionArgs): EvalValue => {
  const wanted = wantedOf(args);
  const table = args.value(1);
  const grid = gridOf(table);
  const index = Math.trunc(args.number(2));

  if (index < 1) {
    return raise('#VALUE!');
  }
  if (index > grid.cols) {
    return raise('#REF!');
  }

  const row = args.logical(3, true)
    ? binary(vectorOf(column(table, 0)), wanted, false)
    : fastExact(args, table, wanted);

  return row === undefined ? raise('#N/A') : grid.at(row, index - 1);
};

const hlookup = (args: FunctionArgs): EvalValue => {
  const wanted = wantedOf(args);
  const grid = gridOf(args.value(1));
  const index = Math.trunc(args.number(2));
  const first: Vector = { length: grid.cols, horizontal: true, at: (col) => grid.at(0, col) };

  if (index < 1) {
    return raise('#VALUE!');
  }
  if (index > grid.rows) {
    return raise('#REF!');
  }

  const col = args.logical(3, true)
    ? binary(first, wanted, false)
    : exact(first, wanted, false, true);

  return col === undefined ? raise('#N/A') : grid.at(index - 1, col);
};

const match = (args: FunctionArgs): EvalValue => {
  const wanted = wantedOf(args);
  const source = args.value(1);
  const vector = vectorOf(source);
  const type = Math.sign(args.number(2, 1));

  const found =
    type === 0 ? columnExact(args, source, vector, wanted, true) : binary(vector, wanted, type < 0);

  return found === undefined ? raise('#N/A') : numberValue(found + 1);
};

const modeOf = (value: number): MatchMode => {
  switch (Math.trunc(value)) {
    case -1:
      return -1;
    case 0:
      return 0;
    case 1:
      return 1;
    case 2:
      return 2;
    default:
      return raise('#VALUE!');
  }
};

const searchOf = (value: number): boolean => {
  const order = Math.trunc(value);

  if (order !== 1 && order !== -1 && order !== 2 && order !== -2) {
    return raise('#VALUE!');
  }
  return order < 0;
};

const xmatch = (args: FunctionArgs): EvalValue => {
  const found = search(
    args,
    args.value(1),
    wantedOf(args),
    modeOf(args.number(2, 0)),
    searchOf(args.number(3, 1)),
  );

  return found === undefined ? raise('#N/A') : numberValue(found + 1);
};

const slice = (value: EvalValue, index: number, horizontal: boolean): EvalValue => {
  if (value.kind === EvalValueKind.Reference) {
    const { range } = value;

    return {
      kind: 'reference',
      sheet: value.sheet,
      range: horizontal
        ? { ...range, left: range.left + index, right: range.left + index }
        : { ...range, top: range.top + index, bottom: range.top + index },
    };
  }
  const grid = gridOf(value);

  return horizontal
    ? buildArray({ rows: grid.rows, cols: 1 }, (row) => grid.at(row, index))
    : buildArray({ rows: 1, cols: grid.cols }, (_row, col) => grid.at(index, col));
};

const xlookup = (args: FunctionArgs): EvalValue => {
  const source = args.value(1);
  const vector = vectorOf(source);
  const results = args.value(2);
  const grid = gridOf(results);
  const length = vector.horizontal ? grid.cols : grid.rows;

  const found = search(
    args,
    source,
    wantedOf(args),
    modeOf(args.number(4, 0)),
    searchOf(args.number(5, 1)),
  );

  if (length !== vector.length) {
    return raise('#VALUE!');
  }
  if (found === undefined) {
    return args.missing(3) ? raise('#N/A') : args.value(3);
  }
  return slice(results, found, vector.horizontal);
};

const lineIndex = (value: number, size: number): number => {
  const index = Math.trunc(value);

  return index < 0 || index > size ? raise('#REF!') : index;
};

const tableOf = (args: FunctionArgs): EvalValue => {
  const area = Math.trunc(args.number(3, 1));
  const table = args.value(0);

  if (area < 1) {
    return raise('#VALUE!');
  }
  if (table.kind !== EvalValueKind.Areas) {
    return area === 1 ? table : raise('#REF!');
  }

  const range = table.ranges[area - 1];

  return range === undefined
    ? raise('#REF!')
    : { kind: EvalValueKind.Reference, sheet: table.sheet, range };
};

const indexAt = (args: FunctionArgs): EvalValue => {
  const table = tableOf(args);
  const grid = gridOf(table);
  const single = grid.rows === 1 && args.missing(2);
  const row = single ? 1 : lineIndex(args.number(1), grid.rows);

  const col = single
    ? lineIndex(args.number(1), grid.cols)
    : lineIndex(args.number(2, 0), grid.cols);

  if (row === 0 && col === 0) {
    return table;
  }
  if (row === 0) {
    return slice(table, col - 1, true);
  }
  if (col === 0) {
    return slice(table, row - 1, false);
  }
  return slice(slice(table, row - 1, false), col - 1, true);
};

const lookup = (args: FunctionArgs): EvalValue => {
  const wanted = wantedOf(args);
  const keys = vectorOf(args.value(1));
  const results = args.missing(2) ? keys : vectorOf(args.value(2));
  const found = binary(keys, wanted, false);

  return found === undefined ? raise('#N/A') : results.at(found);
};

export const LOOKUP_FUNCTIONS: readonly FunctionSpec[] = [
  defineFunction({ name: 'VLOOKUP', min: 3, max: 4, lift: [0], arrays: [1], evaluate: vlookup }),
  defineFunction({ name: 'HLOOKUP', min: 3, max: 4, lift: [0], arrays: [1], evaluate: hlookup }),
  defineFunction({ name: 'MATCH', min: 2, max: 3, lift: [0], arrays: [1], evaluate: match }),
  defineFunction({ name: 'XMATCH', min: 2, max: 4, lift: [0], arrays: [1], evaluate: xmatch }),
  defineFunction({
    name: 'XLOOKUP',
    min: 3,
    max: 6,
    lift: [0],
    arrays: [1, 2],
    givesReference: true,
    evaluate: xlookup,
  }),
  defineFunction({
    name: 'INDEX',
    min: 2,
    max: 4,
    arrays: [0],
    givesReference: true,
    evaluate: indexAt,
  }),
  defineFunction({ name: 'LOOKUP', min: 2, max: 3, lift: [0], arrays: [1, 2], evaluate: lookup }),
  defineFunction({
    name: 'CHOOSE',
    min: 2,
    max: MANY,
    givesReference: true,
    lift: [0],
    evaluate: (args) => {
      const index = Math.trunc(args.number(0));

      return index < 1 || index >= args.count ? raise('#VALUE!') : args.value(index);
    },
  }),
];
