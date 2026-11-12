import { CellError, CellValueKind, type CellValue } from '../cell.types';
import { booleanValue, errorValue, numberValue } from '../values';
import { isMultiCell } from './array';
import { EvalValueKind, type FunctionSpec } from './calc.types';
import { raise } from './coerce';
import { defineFunction } from './registry';
import { firstArgument } from './signatures';

const REFERENCES: ReadonlySet<string> = new Set([EvalValueKind.Reference, EvalValueKind.Areas]);

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
    case CellValueKind.Number:
      return Math.trunc(value.value);
    case CellValueKind.Empty:
      return 0;
    case CellValueKind.Error:
      return raise(value.code);
    default:
      return raise('#VALUE!');
  }
};

const typeOf = (value: CellValue): number => {
  switch (value.kind) {
    case CellValueKind.String:
      return 2;
    case CellValueKind.Boolean:
      return 4;
    case CellValueKind.Error:
      return 16;
    default:
      return 1;
  }
};

export const INFORMATION_FUNCTIONS: readonly FunctionSpec[] = [
  check('ISBLANK', (value) => value.kind === CellValueKind.Empty),
  check('ISNUMBER', (value) => value.kind === CellValueKind.Number),
  check('ISTEXT', (value) => value.kind === CellValueKind.String),
  check('ISNONTEXT', (value) => value.kind !== CellValueKind.String),
  check('ISLOGICAL', (value) => value.kind === CellValueKind.Boolean),
  check('ISERROR', (value) => value.kind === CellValueKind.Error),
  check('ISERR', (value) => value.kind === CellValueKind.Error && value.code !== CellError.Na),
  check('ISNA', (value) => value.kind === CellValueKind.Error && value.code === CellError.Na),
  check('ISEVEN', (value) => integerOf(value) % 2 === 0),
  check('ISODD', (value) => Math.abs(integerOf(value) % 2) === 1),
  defineFunction({
    name: 'ISREF',
    min: 1,
    max: 1,
    unreadAt: firstArgument,
    evaluate: (args) => booleanValue(REFERENCES.has(args.value(0).kind)),
  }),
  defineFunction({
    name: 'N',
    min: 1,
    max: 1,
    lift: [0],
    evaluate: (args) => {
      const value = args.scalar(0);

      switch (value.kind) {
        case CellValueKind.Number:
          return value;
        case CellValueKind.Boolean:
          return numberValue(Number(value.value));
        case CellValueKind.Error:
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
        value.kind === EvalValueKind.Array || isMultiCell(value) ? 64 : typeOf(args.scalar(0)),
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

      return value.kind === CellValueKind.Error
        ? numberValue(ERROR_TYPES[value.code])
        : raise('#N/A');
    },
  }),
];
