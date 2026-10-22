import type { NumberLocale } from '../format/format.types';
import type { CellValue } from '../cell.types';
import { EMPTY, errorValue } from '../values';
import { MANY } from './aggregate';
import type { EvalValue, FunctionArgs, FunctionSpec } from './calc.types';
import { compareValues, lookupKey, raise, toLogical } from './coerce';
import { defineFunction } from './registry';

type Rows = readonly (readonly CellValue[])[];

const MISSING_ITEM = errorValue('#N/A');

const RANK: Readonly<Record<CellValue['kind'], number>> = {
  number: 0,
  string: 1,
  boolean: 2,
  error: 3,
  empty: 4,
};

const widthOf = (rows: Rows): number => rows[0]?.length ?? 0;

const transpose = (rows: Rows): CellValue[][] =>
  Array.from({ length: widthOf(rows) }, (_, col) => rows.map((row) => row[col] ?? EMPTY));

const arrayOf = (rows: Rows): EvalValue =>
  rows.length === 0 || widthOf(rows) === 0 ? raise('#CALC!') : { kind: 'array', rows };

const oriented = (rows: Rows, byCol: boolean, change: (rows: Rows) => Rows): EvalValue =>
  arrayOf(byCol ? transpose(change(transpose(rows))) : change(rows));

const sortOrder = (left: CellValue, right: CellValue): number =>
  left.kind === right.kind && left.kind !== 'error' && left.kind !== 'empty'
    ? compareValues(left, right)
    : RANK[left.kind] - RANK[right.kind];

const ordered =
  (direction: number) =>
  (left: CellValue, right: CellValue): number => {
    const blanks = Number(left.kind === 'empty') - Number(right.kind === 'empty');

    return blanks === 0 ? direction * sortOrder(left, right) : blanks;
  };

const directionOf = (value: number): number =>
  value === 1 || value === -1 ? value : raise('#VALUE!');

const sortRows = (args: FunctionArgs): EvalValue => {
  const index = Math.trunc(args.number(1, 1)) - 1;
  const compare = ordered(directionOf(Math.trunc(args.number(2, 1))));

  return oriented(args.matrix(0), args.logical(3, false), (rows) =>
    index < 0 || index >= widthOf(rows)
      ? raise('#VALUE!')
      : rows.toSorted((left, right) => compare(left[index] ?? EMPTY, right[index] ?? EMPTY)),
  );
};

const keysOf = (args: FunctionArgs, length: number) => {
  const keys: { readonly values: readonly CellValue[]; readonly direction: number }[] = [];

  for (let index = 1; index < args.count; index += 2) {
    const values = args.matrix(index).flat();

    if (values.length !== length) {
      return raise('#VALUE!');
    }
    keys.push({ values, direction: directionOf(Math.trunc(args.number(index + 1, 1))) });
  }
  return keys;
};

const sortBy = (args: FunctionArgs): EvalValue => {
  const rows = args.matrix(0);
  const first = args.matrix(1);
  const byCol = first.length === 1 && widthOf(first) > 1;

  return oriented(rows, byCol, (lines) => {
    const keys = keysOf(args, lines.length);
    const order = lines.map((_, index) => index);

    order.sort((left, right) => {
      for (const key of keys) {
        const step = ordered(key.direction)(key.values[left] ?? EMPTY, key.values[right] ?? EMPTY);

        if (step !== 0) {
          return step;
        }
      }
      return left - right;
    });

    return order.map((index) => lines[index] ?? []);
  });
};

const rowKey = (row: readonly CellValue[]): string =>
  row.map((item) => lookupKey(item) ?? item.kind).join('\u0000');

const unique = (args: FunctionArgs): EvalValue =>
  oriented(args.matrix(0), args.logical(1, false), (rows) => {
    const counts = new Map<string, number>();

    rows.forEach((row) => {
      counts.set(rowKey(row), (counts.get(rowKey(row)) ?? 0) + 1);
    });

    const once = args.logical(2, false);
    const seen = new Set<string>();

    return rows.filter((row) => {
      const key = rowKey(row);
      const keep = !seen.has(key) && (!once || counts.get(key) === 1);

      seen.add(key);
      return keep;
    });
  });

const included = (value: CellValue, locale: NumberLocale): boolean =>
  value.kind === 'empty' ? false : toLogical(value, locale);

const byColumns = (rows: Rows, include: Rows): boolean => {
  if (include.length === rows.length && widthOf(include) === 1) {
    return false;
  }
  return include.length === 1 && widthOf(include) === widthOf(rows) ? true : raise('#VALUE!');
};

const filter = (args: FunctionArgs): EvalValue => {
  const rows = args.matrix(0);
  const include = args.matrix(1);
  const byCol = byColumns(rows, include);
  const flags = include.flat().map((value) => included(value, args.locale));
  const kept = (byCol ? transpose(rows) : rows).filter((_, index) => flags[index] === true);

  if (kept.length === 0) {
    return args.missing(2) ? raise('#CALC!') : args.value(2);
  }
  return arrayOf(byCol ? transpose(kept) : kept);
};

const edge = (rows: Rows, count: number, drop: boolean): Rows => {
  if (count === 0) {
    return drop ? rows : [];
  }
  const size = Math.min(Math.abs(count), rows.length);
  const fromStart = count > 0;

  if (drop) {
    return fromStart ? rows.slice(size) : rows.slice(0, rows.length - size);
  }
  return fromStart ? rows.slice(0, size) : rows.slice(rows.length - size);
};

const takeOrDrop =
  (drop: boolean) =>
  (args: FunctionArgs): EvalValue => {
    const rows = args.matrix(0);
    const byRows = args.missing(1) ? rows : edge(rows, Math.trunc(args.number(1)), drop);

    return args.missing(2)
      ? arrayOf(byRows)
      : arrayOf(transpose(edge(transpose(byRows), Math.trunc(args.number(2)), drop)));
  };

const pick = (rows: Rows, args: FunctionArgs): Rows =>
  Array.from({ length: args.count - 1 }, (_, offset) => {
    const index = Math.trunc(args.number(offset + 1));
    const row = index > 0 ? rows[index - 1] : rows[rows.length + index];

    return index === 0 || row === undefined ? raise('#VALUE!') : row;
  });

const stack = (args: FunctionArgs, byCol: boolean): EvalValue => {
  const parts = Array.from({ length: args.count }, (_, index) =>
    byCol ? transpose(args.matrix(index)) : args.matrix(index),
  );

  const width = Math.max(...parts.map(widthOf));

  const rows = parts.flatMap((part) =>
    part.map((row) => Array.from({ length: width }, (_, col) => row[col] ?? MISSING_ITEM)),
  );

  return arrayOf(byCol ? transpose(rows) : rows);
};

export const SHAPE_FUNCTIONS: readonly FunctionSpec[] = [
  defineFunction({ name: 'FILTER', array: true, min: 2, max: 3, evaluate: filter }),
  defineFunction({ name: 'SORT', array: true, min: 1, max: 4, evaluate: sortRows }),
  defineFunction({ name: 'SORTBY', array: true, min: 2, max: MANY, evaluate: sortBy }),
  defineFunction({ name: 'UNIQUE', array: true, min: 1, max: 3, evaluate: unique }),
  defineFunction({ name: 'TAKE', array: true, min: 2, max: 3, evaluate: takeOrDrop(false) }),
  defineFunction({ name: 'DROP', array: true, min: 2, max: 3, evaluate: takeOrDrop(true) }),
  defineFunction({
    name: 'CHOOSEROWS',
    array: true,
    min: 2,
    max: MANY,
    evaluate: (args) => arrayOf(pick(args.matrix(0), args)),
  }),
  defineFunction({
    name: 'CHOOSECOLS',
    array: true,
    min: 2,
    max: MANY,
    evaluate: (args) => arrayOf(transpose(pick(transpose(args.matrix(0)), args))),
  }),
  defineFunction({
    name: 'VSTACK',
    array: true,
    min: 1,
    max: MANY,
    evaluate: (args) => stack(args, false),
  }),
  defineFunction({
    name: 'HSTACK',
    array: true,
    min: 1,
    max: MANY,
    evaluate: (args) => stack(args, true),
  }),
];
