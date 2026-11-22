import { MAX_COLS, MAX_ROWS } from '../address';
import { CellValueKind, type CellRange, type CellValue } from '../cell.types';
import { EMPTY } from '../values';
import type { NumberLocale } from '../format/format.types';
import { EvalValueKind, type EvalValue, type FunctionArgs } from './calc.types';
import { raise, toNumber } from './coerce';
import { parseCriterion, type Criterion } from './criteria';

export type Reference = Extract<EvalValue, { readonly kind: typeof EvalValueKind.Reference }>;

export interface Condition {
  readonly range: Reference;
  readonly test: Criterion;
}

export const MANY = 255;

export const eachNumber = (
  args: FunctionArgs,
  visit: (value: number) => void,
  from = 0,
  to = args.count,
): void => {
  args.forEachValue(
    from,
    (value, direct) => {
      if (value.kind === CellValueKind.Error) {
        raise(value.code);
      }
      if (value.kind === CellValueKind.Number) {
        visit(value.value);
      } else if (direct) {
        visit(toNumber(value, args.locale));
      }
    },
    to,
  );
};

const numberOfAny = (
  value: CellValue,
  direct: boolean,
  locale: NumberLocale,
): number | undefined => {
  switch (value.kind) {
    case CellValueKind.Number:
      return value.value;
    case CellValueKind.Boolean:
      return value.value ? 1 : 0;
    case CellValueKind.String:
      return direct ? toNumber(value, locale) : 0;
    case CellValueKind.Error:
      return raise(value.code);
    default:
      return direct ? 0 : undefined;
  }
};

export const eachValueAsNumber = (args: FunctionArgs, visit: (value: number) => void): void => {
  args.forEachValue(0, (value, direct) => {
    const number = numberOfAny(value, direct, args.locale);

    if (number === undefined) {
      return;
    }

    visit(number);
  });
};

export const numbersOf = (args: FunctionArgs, from = 0, to = args.count): number[] => {
  const found: number[] = [];

  eachNumber(
    args,
    (value) => {
      found.push(value);
    },
    from,
    to,
  );

  return found;
};

export const referenceOf = (value: EvalValue): Reference =>
  value.kind === EvalValueKind.Reference ? value : raise('#VALUE!');

const sameShape = (left: CellRange, right: CellRange): boolean =>
  left.bottom - left.top === right.bottom - right.top &&
  left.right - left.left === right.right - right.left;

export const conditionsOf = (args: FunctionArgs, from: number): Condition[] => {
  const conditions: Condition[] = [];

  for (let index = from; index + 1 < args.count; index += 2) {
    conditions.push({
      range: referenceOf(args.value(index)),
      test: parseCriterion(args.scalar(index + 1), args.locale),
    });
  }

  const first = conditions[0]?.range.range;

  if (first === undefined || (args.count - from) % 2 !== 0) {
    return raise('#VALUE!');
  }
  return conditions.every((condition) => sameShape(condition.range.range, first))
    ? conditions
    : raise('#VALUE!');
};

const passes = (conditions: readonly Condition[], row: number, col: number): boolean =>
  conditions.every(({ range, test }) =>
    test(range.sheet.cells.get(range.range.top + row, range.range.left + col)),
  );

const anchored = (target: Reference, like: CellRange): Reference => ({
  ...target,
  range: {
    top: target.range.top,
    left: target.range.left,
    bottom: Math.min(MAX_ROWS - 1, target.range.top + like.bottom - like.top),
    right: Math.min(MAX_COLS - 1, target.range.left + like.right - like.left),
  },
});

export const sumRangeOf = (args: FunctionArgs, conditions: readonly Condition[]): Reference => {
  const first = conditions[0]?.range;

  if (first === undefined) {
    return raise('#VALUE!');
  }
  if (args.count <= 2) {
    return first;
  }

  const given = referenceOf(args.value(2));
  const target = anchored(given, first.range);

  return sameShape(target.range, given.range)
    ? given
    : referenceOf(args.refer(target.sheet, target.range));
};

export const ifsRangeOf = (args: FunctionArgs, conditions: readonly Condition[]): Reference => {
  const target = referenceOf(args.value(0));
  const shape = conditions[0]?.range.range;

  return shape === undefined || sameShape(target.range, shape) ? target : raise('#VALUE!');
};

export const forEachMatch = (
  conditions: readonly Condition[],
  target: Reference | undefined,
  visit: (row: number, col: number) => void,
): void => {
  const shape = conditions[0]?.range.range;
  const driver = conditions.find((condition) => !condition.test(EMPTY))?.range;

  const source =
    driver ?? (target === undefined || shape === undefined ? undefined : anchored(target, shape));

  source?.sheet.cells.forEachInRange(source.range, (row, col) => {
    const offsetRow = row - source.range.top;
    const offsetCol = col - source.range.left;

    if (!passes(conditions, offsetRow, offsetCol)) {
      return;
    }

    visit(offsetRow, offsetCol);
  });
};

export const countMatches = (conditions: readonly Condition[]): number => {
  const shape = conditions[0]?.range.range;

  if (shape === undefined) {
    return 0;
  }
  if (conditions.some((condition) => !condition.test(EMPTY))) {
    let count = 0;

    forEachMatch(conditions, undefined, () => {
      count += 1;
    });

    return count;
  }

  const candidates = new Set<number>();

  conditions.forEach(({ range }) => {
    range.sheet.cells.forEachInRange(range.range, (row, col) => {
      candidates.add((row - range.range.top) * MAX_COLS + (col - range.range.left));
    });
  });

  let failures = 0;

  candidates.forEach((offset) => {
    failures += Number(!passes(conditions, Math.floor(offset / MAX_COLS), offset % MAX_COLS));
  });

  return (shape.bottom - shape.top + 1) * (shape.right - shape.left + 1) - failures;
};

export const targetValue = (target: Reference, row: number, col: number): CellValue =>
  target.sheet.cells.get(target.range.top + row, target.range.left + col);
