import type { CellValue } from '../cell.types';
import type { NumberLocale } from '../format/format.types';
import { numberValue } from '../values';
import {
  MANY,
  conditionsOf,
  countMatches,
  eachNumber,
  eachValueAsNumber,
  forEachMatch,
  numbersOf,
  referenceOf,
  targetValue,
  type Condition,
  type Reference,
} from './aggregate';
import type { EvalValue, FunctionArgs, FunctionSpec } from './calc.types';
import { numberFromText, raise } from './coerce';
import { defineFunction } from './registry';

const counts = (value: CellValue, direct: boolean, locale: NumberLocale): boolean => {
  switch (value.kind) {
    case 'number':
      return true;
    case 'boolean':
    case 'empty':
      return direct;
    case 'string':
      return direct && numberFromText(value.value, locale) !== undefined;
    default:
      return false;
  }
};

const alias = (spec: FunctionSpec, name: string): FunctionSpec => ({ ...spec, name });

const sorted = (values: readonly number[]): number[] => values.toSorted((a, b) => a - b);

const mean = (values: readonly number[]): number =>
  values.length === 0
    ? raise('#DIV/0!')
    : values.reduce((total, value) => total + value, 0) / values.length;

const squares = (values: readonly number[]): number => {
  const centre = mean(values);

  return values.reduce((total, value) => total + (value - centre) ** 2, 0);
};

const variance = (values: readonly number[], sample: boolean): number => {
  const divisor = values.length - Number(sample);

  return divisor < 1 ? raise('#DIV/0!') : squares(values) / divisor;
};

const interpolated = (values: readonly number[], position: number): number => {
  const low = Math.floor(position);
  const share = position - low;
  const below = values[low] ?? raise('#NUM!');
  const above = values[Math.min(low + 1, values.length - 1)] ?? below;

  return below + share * (above - below);
};

const percentile = (values: readonly number[], share: number, exclusive: boolean): number => {
  const ordered = sorted(values);
  const count = ordered.length;

  if (count === 0 || share < 0 || share > 1) {
    return raise('#NUM!');
  }
  if (!exclusive) {
    return interpolated(ordered, share * (count - 1));
  }
  const rank = share * (count + 1);

  return rank < 1 || rank > count ? raise('#NUM!') : interpolated(ordered, rank - 1);
};

const quartile = (args: FunctionArgs, exclusive: boolean): number => {
  const quart = Math.trunc(args.number(1));
  const low = exclusive ? 1 : 0;
  const high = exclusive ? 3 : 4;

  return quart < low || quart > high
    ? raise('#NUM!')
    : percentile(numbersOf(args, 0, 1), quart / 4, exclusive);
};

const nth = (args: FunctionArgs, largest: boolean): number => {
  const ordered = sorted(numbersOf(args, 0, 1));
  const k = Math.ceil(args.number(1));

  if (k < 1 || k > ordered.length) {
    return raise('#NUM!');
  }
  return (largest ? ordered[ordered.length - k] : ordered[k - 1]) ?? raise('#NUM!');
};

const mode = (values: readonly number[]): number => {
  const seen = new Map<number, number>();

  values.forEach((value) => {
    seen.set(value, (seen.get(value) ?? 0) + 1);
  });

  const top = Math.max(0, ...seen.values());
  const found = values.find((value) => seen.get(value) === top);

  return top < 2 || found === undefined ? raise('#N/A') : found;
};

const rank = (args: FunctionArgs): number => {
  const value = args.number(0);
  const values = numbersOf(args, 1, 2);
  const ascending = args.number(2, 0) !== 0;

  if (!values.includes(value)) {
    return raise('#N/A');
  }
  return 1 + values.filter((other) => (ascending ? other < value : other > value)).length;
};

const positive = (values: readonly number[]): readonly number[] =>
  values.some((value) => value <= 0) ? raise('#NUM!') : values;

const statistic = (name: string, compute: (values: readonly number[]) => number): FunctionSpec =>
  defineFunction({
    name,
    min: 1,
    max: MANY,
    evaluate: (args) => numberValue(compute(numbersOf(args))),
  });

const extreme =
  (pick: (left: number, right: number) => number, every: typeof eachNumber) =>
  (args: FunctionArgs): EvalValue => {
    let found: number | undefined;

    every(args, (value) => {
      found = found === undefined ? value : pick(found, value);
    });

    return numberValue(found ?? 0);
  };

const matched = (conditions: readonly Condition[], range: Reference): number[] => {
  const found: number[] = [];

  forEachMatch(conditions, range, (row, col) => {
    const value = targetValue(range, row, col);

    if (value.kind === 'error') {
      raise(value.code);
    }
    if (value.kind === 'number') {
      found.push(value.value);
    }
  });

  return found;
};

const averageIf = (args: FunctionArgs): EvalValue => {
  const conditions = conditionsOf({ ...args, count: 2 }, 0);
  const range = args.count > 2 ? referenceOf(args.value(2)) : conditions[0]?.range;

  return range === undefined ? raise('#VALUE!') : numberValue(mean(matched(conditions, range)));
};

const ifsExtreme =
  (pick: (values: readonly number[]) => number) =>
  (args: FunctionArgs): EvalValue => {
    const found = matched(conditionsOf(args, 1), referenceOf(args.value(0)));

    return numberValue(found.length === 0 ? 0 : pick(found));
  };

const countBlank = (args: FunctionArgs): EvalValue => {
  const { sheet, range } = referenceOf(args.value(0));
  let filled = 0;

  sheet.cells.forEachInRange(range, (_row, _col, value) => {
    filled += Number(value.kind !== 'string' || value.value !== '');
  });

  return numberValue((range.bottom - range.top + 1) * (range.right - range.left + 1) - filled);
};

const MEDIAN = statistic('MEDIAN', (values) => percentile(values, 0.5, false));

const MODE = statistic('MODE.SNGL', mode);

const STDEV = statistic('STDEV.S', (values) => Math.sqrt(variance(values, true)));

const STDEVP = statistic('STDEV.P', (values) => Math.sqrt(variance(values, false)));

const VAR = statistic('VAR.S', (values) => variance(values, true));

const VARP = statistic('VAR.P', (values) => variance(values, false));

const RANK = defineFunction({
  name: 'RANK.EQ',
  min: 2,
  max: 3,
  evaluate: (args) => numberValue(rank(args)),
});

const PERCENTILE = defineFunction({
  name: 'PERCENTILE.INC',
  min: 2,
  max: 2,
  evaluate: (args) => numberValue(percentile(numbersOf(args, 0, 1), args.number(1), false)),
});

const QUARTILE = defineFunction({
  name: 'QUARTILE.INC',
  min: 2,
  max: 2,
  evaluate: (args) => numberValue(quartile(args, false)),
});

export const STATISTICS_FUNCTIONS: readonly FunctionSpec[] = [
  defineFunction({
    name: 'AVERAGE',
    min: 1,
    max: MANY,
    evaluate: (args) => numberValue(mean(numbersOf(args))),
  }),
  defineFunction({
    name: 'AVERAGEA',
    min: 1,
    max: MANY,
    evaluate: (args) => {
      const found: number[] = [];

      eachValueAsNumber(args, (value) => {
        found.push(value);
      });

      return numberValue(mean(found));
    },
  }),
  defineFunction({ name: 'AVERAGEIF', min: 2, max: 3, evaluate: averageIf }),
  defineFunction({
    name: 'AVERAGEIFS',
    min: 3,
    max: MANY,
    evaluate: (args) =>
      numberValue(mean(matched(conditionsOf(args, 1), referenceOf(args.value(0))))),
  }),
  defineFunction({
    name: 'COUNT',
    min: 1,
    max: MANY,
    evaluate: (args) => {
      let count = 0;

      args.forEachValue(0, (value, direct) => {
        count += Number(counts(value, direct, args.locale));
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
  defineFunction({ name: 'COUNTBLANK', min: 1, max: 1, evaluate: countBlank }),
  defineFunction({
    name: 'COUNTIF',
    min: 2,
    max: 2,
    evaluate: (args) => numberValue(countMatches(conditionsOf(args, 0))),
  }),
  defineFunction({
    name: 'COUNTIFS',
    min: 2,
    max: MANY,
    evaluate: (args) => numberValue(countMatches(conditionsOf(args, 0))),
  }),
  defineFunction({ name: 'MIN', min: 1, max: MANY, evaluate: extreme(Math.min, eachNumber) }),
  defineFunction({ name: 'MAX', min: 1, max: MANY, evaluate: extreme(Math.max, eachNumber) }),
  defineFunction({
    name: 'MINA',
    min: 1,
    max: MANY,
    evaluate: extreme(Math.min, eachValueAsNumber),
  }),
  defineFunction({
    name: 'MAXA',
    min: 1,
    max: MANY,
    evaluate: extreme(Math.max, eachValueAsNumber),
  }),
  defineFunction({
    name: 'MINIFS',
    min: 3,
    max: MANY,
    evaluate: ifsExtreme((values) => Math.min(...values)),
  }),
  defineFunction({
    name: 'MAXIFS',
    min: 3,
    max: MANY,
    evaluate: ifsExtreme((values) => Math.max(...values)),
  }),
  MEDIAN,
  MODE,
  alias(MODE, 'MODE'),
  defineFunction({
    name: 'LARGE',
    min: 2,
    max: 2,
    evaluate: (args) => numberValue(nth(args, true)),
  }),
  defineFunction({
    name: 'SMALL',
    min: 2,
    max: 2,
    evaluate: (args) => numberValue(nth(args, false)),
  }),
  RANK,
  alias(RANK, 'RANK'),
  PERCENTILE,
  alias(PERCENTILE, 'PERCENTILE'),
  defineFunction({
    name: 'PERCENTILE.EXC',
    min: 2,
    max: 2,
    evaluate: (args) => numberValue(percentile(numbersOf(args, 0, 1), args.number(1), true)),
  }),
  QUARTILE,
  alias(QUARTILE, 'QUARTILE'),
  defineFunction({
    name: 'QUARTILE.EXC',
    min: 2,
    max: 2,
    evaluate: (args) => numberValue(quartile(args, true)),
  }),
  STDEV,
  alias(STDEV, 'STDEV'),
  STDEVP,
  alias(STDEVP, 'STDEVP'),
  VAR,
  alias(VAR, 'VAR'),
  VARP,
  alias(VARP, 'VARP'),
  statistic('DEVSQ', squares),
  statistic('AVEDEV', (values) => {
    const centre = mean(values);

    return mean(values.map((value) => Math.abs(value - centre)));
  }),
  statistic('GEOMEAN', (values) =>
    Math.exp(mean(positive(values).map((value) => Math.log(value)))),
  ),
  statistic('HARMEAN', (values) => 1 / mean(positive(values).map((value) => 1 / value))),
];
