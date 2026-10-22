import { numberValue } from '../values';
import { buildArray } from './array';
import { arrayShape } from './array-functions';
import type { FunctionArgs, FunctionSpec } from './calc.types';
import { raise } from './coerce';
import { defineFunction } from './registry';

const between = (args: FunctionArgs, low: number, high: number, whole: boolean): number => {
  const value = low + args.random() * (high - low + Number(whole));

  return whole ? Math.min(high, Math.floor(value)) : value;
};

export const VOLATILE_FUNCTIONS: readonly FunctionSpec[] = [
  defineFunction({
    name: 'NOW',
    min: 0,
    max: 0,
    volatile: true,
    evaluate: (args) => numberValue(args.now()),
  }),
  defineFunction({
    name: 'TODAY',
    min: 0,
    max: 0,
    volatile: true,
    evaluate: (args) => numberValue(Math.floor(args.now())),
  }),
  defineFunction({
    name: 'RAND',
    min: 0,
    max: 0,
    volatile: true,
    evaluate: (args) => numberValue(args.random()),
  }),
  defineFunction({
    name: 'RANDBETWEEN',
    min: 2,
    max: 2,
    volatile: true,
    evaluate: (args) => {
      const low = Math.ceil(args.number(0));
      const high = Math.floor(args.number(1));

      return low > high ? raise('#NUM!') : numberValue(between(args, low, high, true));
    },
  }),
  defineFunction({
    name: 'RANDARRAY',
    array: true,
    min: 0,
    max: 5,
    volatile: true,
    evaluate: (args) => {
      const shape = arrayShape(args.number(0, 1), args.number(1, 1));
      const whole = args.logical(4, false);
      const low = whole ? Math.ceil(args.number(2, 0)) : args.number(2, 0);
      const high = whole ? Math.floor(args.number(3, 1)) : args.number(3, 1);

      if (low > high) {
        return raise('#VALUE!');
      }
      return buildArray(shape, () => numberValue(between(args, low, high, whole)));
    },
  }),
];
