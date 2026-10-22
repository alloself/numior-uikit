import { numberValue } from '../values';
import {
  MANY,
  conditionsOf,
  eachNumber,
  forEachMatch,
  numbersOf,
  referenceOf,
  targetValue,
  type Condition,
  type Reference,
} from './aggregate';
import { matrixOf, shapeOf } from './array';
import type { EvalValue, FunctionArgs, FunctionSpec } from './calc.types';
import { raise } from './coerce';
import { defineFunction } from './registry';
import { roundHalfAway, scaled } from './rounding';

const MAX_FACTORIAL = 170;

const unary = (name: string, compute: (value: number) => number): FunctionSpec =>
  defineFunction({
    name,
    min: 1,
    max: 1,
    lift: [0],
    evaluate: (args) => numberValue(compute(args.number(0))),
  });

const binary = (
  name: string,
  compute: (left: number, right: number) => number,
  min = 2,
  fallback?: number,
): FunctionSpec =>
  defineFunction({
    name,
    min,
    max: 2,
    lift: [0, 1],
    evaluate: (args) => numberValue(compute(args.number(0), args.number(1, fallback))),
  });

const nonNegative = (value: number): number => (value < 0 ? raise('#NUM!') : value);

const factorial = (value: number): number => {
  const whole = Math.trunc(nonNegative(value));
  let product = 1;

  if (whole > MAX_FACTORIAL) {
    return raise('#NUM!');
  }
  for (let factor = 2; factor <= whole; factor += 1) {
    product *= factor;
  }
  return product;
};

const choose = (total: number, picked: number, ordered: boolean): number => {
  const n = Math.trunc(total);
  const k = Math.trunc(picked);
  let product = 1;

  if (n < 0 || k < 0 || n < k) {
    return raise('#NUM!');
  }
  for (let index = 0; index < k; index += 1) {
    product = ordered ? product * (n - index) : (product * (n - index)) / (index + 1);
  }
  return ordered ? product : Math.round(product);
};

const gcdOf = (left: number, right: number): number => {
  let a = left;
  let b = right;

  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
};

const integers = (args: FunctionArgs): number[] =>
  numbersOf(args).map((value) => Math.trunc(nonNegative(value)));

const multiple = (value: number, significance: number, round: (value: number) => number) =>
  significance === 0 ? 0 : round(Number((value / significance).toPrecision(15))) * significance;

const ceiling = (value: number, significance: number): number =>
  value > 0 && significance < 0 ? raise('#NUM!') : multiple(value, significance, Math.ceil);

const floor = (value: number, significance: number): number => {
  if (significance === 0) {
    return value === 0 ? 0 : raise('#DIV/0!');
  }
  return value > 0 && significance < 0 ? raise('#NUM!') : multiple(value, significance, Math.floor);
};

const mathRound = (args: FunctionArgs, up: boolean): number => {
  const value = args.number(0);
  const significance = Math.abs(args.number(1, 1));
  const away = args.number(2, 0) !== 0 && value < 0;
  const round = up === away ? Math.floor : Math.ceil;

  return multiple(value, significance, round);
};

const parity = (value: number, odd: boolean): number => {
  const sign = value < 0 ? -1 : 1;
  const away = Math.ceil(Number(Math.abs(value).toPrecision(15)));
  const fits = (away % 2 === 1) === odd;

  return sign * (fits ? Math.max(away, odd ? 1 : 0) : away + 1);
};

const sumProduct = (args: FunctionArgs): EvalValue => {
  const values = Array.from({ length: args.count }, (_, index) => args.value(index));
  const shapes = values.map(shapeOf);
  const [first] = shapes;

  if (first === undefined) {
    return raise('#VALUE!');
  }
  if (shapes.some((shape) => shape.rows !== first.rows || shape.cols !== first.cols)) {
    return raise('#VALUE!');
  }

  const matrices = values.map(matrixOf);
  let total = 0;

  for (let row = 0; row < first.rows; row += 1) {
    for (let col = 0; col < first.cols; col += 1) {
      total += matrices.reduce((product, matrix) => {
        const item = matrix[row]?.[col];

        if (item?.kind === 'error') {
          return raise(item.code);
        }
        return product * (item?.kind === 'number' ? item.value : 0);
      }, 1);
    }
  }
  return numberValue(total);
};

const sumIf = (conditions: readonly Condition[], range: Reference): EvalValue => {
  let total = 0;

  forEachMatch(conditions, range, (row, col) => {
    const value = targetValue(range, row, col);

    if (value.kind === 'error') {
      raise(value.code);
    }
    total += value.kind === 'number' ? value.value : 0;
  });

  return numberValue(total);
};

export const MATH_FUNCTIONS: readonly FunctionSpec[] = [
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
    name: 'PRODUCT',
    min: 1,
    max: MANY,
    evaluate: (args) => {
      const found = numbersOf(args);

      return numberValue(found.length === 0 ? 0 : found.reduce((left, right) => left * right, 1));
    },
  }),
  defineFunction({
    name: 'SUMSQ',
    min: 1,
    max: MANY,
    evaluate: (args) =>
      numberValue(numbersOf(args).reduce((total, value) => total + value * value, 0)),
  }),
  defineFunction({ name: 'SUMPRODUCT', min: 1, max: MANY, arrays: 'all', evaluate: sumProduct }),
  defineFunction({
    name: 'SUMIF',
    min: 2,
    max: 3,
    evaluate: (args) => {
      const conditions = conditionsOf({ ...args, count: 2 }, 0);
      const range = args.count > 2 ? referenceOf(args.value(2)) : conditions[0]?.range;

      return range === undefined ? raise('#VALUE!') : sumIf(conditions, range);
    },
  }),
  defineFunction({
    name: 'SUMIFS',
    min: 3,
    max: MANY,
    evaluate: (args) => sumIf(conditionsOf(args, 1), referenceOf(args.value(0))),
  }),
  unary('ABS', Math.abs),
  unary('SIGN', Math.sign),
  unary('INT', Math.floor),
  unary('SQRT', (value) => Math.sqrt(nonNegative(value))),
  unary('EXP', Math.exp),
  unary('LN', (value) => (value <= 0 ? raise('#NUM!') : Math.log(value))),
  unary('LOG10', (value) => (value <= 0 ? raise('#NUM!') : Math.log10(value))),
  binary(
    'LOG',
    (value, base) => {
      if (value <= 0 || base <= 0) {
        return raise('#NUM!');
      }
      return base === 1 ? raise('#DIV/0!') : Math.log(value) / Math.log(base);
    },
    1,
    10,
  ),
  unary('FACT', factorial),
  unary('EVEN', (value) => parity(value, false)),
  unary('ODD', (value) => parity(value, true)),
  unary('SIN', Math.sin),
  unary('COS', Math.cos),
  unary('TAN', Math.tan),
  unary('ASIN', Math.asin),
  unary('ACOS', Math.acos),
  unary('ATAN', Math.atan),
  unary('SINH', Math.sinh),
  unary('COSH', Math.cosh),
  unary('TANH', Math.tanh),
  unary('DEGREES', (value) => (value * 180) / Math.PI),
  unary('RADIANS', (value) => (value * Math.PI) / 180),
  binary('ATAN2', (x, y) => (x === 0 && y === 0 ? raise('#DIV/0!') : Math.atan2(y, x))),
  binary('ROUND', roundHalfAway),
  binary('ROUNDUP', (value, digits) => scaled(value, digits, Math.ceil)),
  binary('ROUNDDOWN', (value, digits) => scaled(value, digits, Math.floor)),
  binary('TRUNC', (value, digits) => scaled(value, digits, Math.floor), 1, 0),
  binary('MOD', (value, divisor) =>
    divisor === 0 ? raise('#DIV/0!') : value - divisor * Math.floor(value / divisor),
  ),
  binary('QUOTIENT', (value, divisor) =>
    divisor === 0 ? raise('#DIV/0!') : Math.trunc(value / divisor),
  ),
  binary('POWER', (base, exponent) =>
    base === 0 && exponent === 0 ? raise('#NUM!') : base ** exponent,
  ),
  binary('CEILING', ceiling),
  binary('FLOOR', floor),
  binary('MROUND', (value, step) => {
    if (step === 0) {
      return 0;
    }
    return Math.sign(value) * Math.sign(step) < 0
      ? raise('#NUM!')
      : roundHalfAway(value / step, 0) * step;
  }),
  binary('COMBIN', (total, picked) => choose(total, picked, false)),
  binary('PERMUT', (total, picked) => choose(total, picked, true)),
  defineFunction({
    name: 'CEILING.MATH',
    min: 1,
    max: 3,
    lift: [0, 1, 2],
    evaluate: (args) => numberValue(mathRound(args, true)),
  }),
  defineFunction({
    name: 'FLOOR.MATH',
    min: 1,
    max: 3,
    lift: [0, 1, 2],
    evaluate: (args) => numberValue(mathRound(args, false)),
  }),
  defineFunction({
    name: 'GCD',
    min: 1,
    max: MANY,
    evaluate: (args) => numberValue(integers(args).reduce(gcdOf, 0)),
  }),
  defineFunction({
    name: 'LCM',
    min: 1,
    max: MANY,
    evaluate: (args) =>
      numberValue(
        integers(args).reduce(
          (total, value) =>
            total === 0 || value === 0 ? 0 : (total * value) / gcdOf(total, value),
          1,
        ),
      ),
  }),
  defineFunction({ name: 'PI', min: 0, max: 0, evaluate: () => numberValue(Math.PI) }),
];
