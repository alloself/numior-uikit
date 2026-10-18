import type { CellError, CellValue } from '../cell.types';
import { booleanValue, errorValue, numberValue } from '../values';
import { isMultiCell } from './array';
import type { FunctionSpec } from './calc.types';
import { raise } from './coerce';
import { defineFunction } from './registry';

const ERROR_TYPES: Readonly<Record<CellError, number>> = {
  '#NULL!': 1,
  '#DIV/0!': 2,
  '#VALUE!': 3,
  '#REF!': 4,
  '#NAME?': 5,
  '#NUM!': 6,
  '#N/A': 7,
  '#SPILL!': 9,
  '#CALC!': 14,
};

const check = (name: string, test: (value: CellValue) => boolean): FunctionSpec =>
  defineFunction({
    name,
    min: 1,
    max: 1,
    lift: [0],
    evaluate: (args) => booleanValue(test(args.scalar(0))),
  });

const integerOf = (value: CellValue): number => {
  switch (value.kind) {
    case 'number':
      return Math.trunc(value.value);
    case 'empty':
      return 0;
    case 'error':
      return raise(value.code);
    default:
      return raise('#VALUE!');
  }
};

const typeOf = (value: CellValue): number => {
  switch (value.kind) {
    case 'string':
      return 2;
    case 'boolean':
      return 4;
    case 'error':
      return 16;
    default:
      return 1;
  }
};

export const INFORMATION_FUNCTIONS: readonly FunctionSpec[] = [
  check('ISBLANK', (value) => value.kind === 'empty'),
  check('ISNUMBER', (value) => value.kind === 'number'),
  check('ISTEXT', (value) => value.kind === 'string'),
  check('ISNONTEXT', (value) => value.kind !== 'string'),
  check('ISLOGICAL', (value) => value.kind === 'boolean'),
  check('ISERROR', (value) => value.kind === 'error'),
  check('ISERR', (value) => value.kind === 'error' && value.code !== '#N/A'),
  check('ISNA', (value) => value.kind === 'error' && value.code === '#N/A'),
  check('ISEVEN', (value) => integerOf(value) % 2 === 0),
  check('ISODD', (value) => Math.abs(integerOf(value) % 2) === 1),
  defineFunction({
    name: 'ISREF',
    min: 1,
    max: 1,
    evaluate: (args) => booleanValue(args.value(0).kind === 'reference'),
  }),
  defineFunction({
    name: 'N',
    min: 1,
    max: 1,
    lift: [0],
    evaluate: (args) => {
      const value = args.scalar(0);

      switch (value.kind) {
        case 'number':
          return value;
        case 'boolean':
          return numberValue(Number(value.value));
        case 'error':
          return value;
        default:
          return numberValue(0);
      }
    },
  }),
  defineFunction({ name: 'NA', min: 0, max: 0, evaluate: () => errorValue('#N/A') }),
  defineFunction({
    name: 'TYPE',
    min: 1,
    max: 1,
    evaluate: (args) => {
      const value = args.value(0);

      return numberValue(
        value.kind === 'array' || isMultiCell(value) ? 64 : typeOf(args.scalar(0)),
      );
    },
  }),
  defineFunction({
    name: 'ERROR.TYPE',
    min: 1,
    max: 1,
    lift: [0],
    evaluate: (args) => {
      const value = args.scalar(0);

      return value.kind === 'error' ? numberValue(ERROR_TYPES[value.code]) : raise('#N/A');
    },
  }),
];
