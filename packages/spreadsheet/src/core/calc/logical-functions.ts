import { booleanValue } from '../values';
import { MANY } from './aggregate';
import type { EvalValue, FunctionArgs, FunctionSpec } from './calc.types';
import { compareValues, raise, toLogical } from './coerce';
import { defineFunction } from './registry';
import { CellError, CellValueKind } from '../cell.types';

const truths = (args: FunctionArgs): boolean[] => {
  const found: boolean[] = [];

  args.forEachValue(0, (value, direct) => {
    if (value.kind === CellValueKind.Error) {
      raise(value.code);
    }
    if (direct || value.kind === CellValueKind.Number || value.kind === CellValueKind.Boolean) {
      found.push(toLogical(value, args.locale));
    }
  });

  return found.length === 0 ? raise('#VALUE!') : found;
};

const ifs = (args: FunctionArgs): EvalValue => {
  for (let index = 0; index + 1 < args.count; index += 2) {
    if (args.logical(index)) {
      return args.value(index + 1);
    }
  }
  return raise('#N/A');
};

const switched = (args: FunctionArgs): EvalValue => {
  const wanted = args.scalar(0);
  const pairs = args.count - 1;

  if (wanted.kind === CellValueKind.Error) {
    return raise(wanted.code);
  }
  for (let index = 1; index + 1 < args.count; index += 2) {
    const candidate = args.scalar(index);

    if (candidate.kind === wanted.kind && compareValues(candidate, wanted) === 0) {
      return args.value(index + 1);
    }
  }
  return pairs % 2 === 1 ? args.value(args.count - 1) : raise('#N/A');
};

export const LOGICAL_FUNCTIONS: readonly FunctionSpec[] = [
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
  defineFunction({ name: 'IFS', min: 2, max: MANY, evaluate: ifs }),
  defineFunction({
    name: 'AND',
    min: 1,
    max: MANY,
    evaluate: (args) => booleanValue(truths(args).every(Boolean)),
  }),
  defineFunction({
    name: 'OR',
    min: 1,
    max: MANY,
    evaluate: (args) => booleanValue(truths(args).some(Boolean)),
  }),
  defineFunction({
    name: 'XOR',
    min: 1,
    max: MANY,
    evaluate: (args) => booleanValue(truths(args).reduce((odd, truth) => odd !== truth, false)),
  }),
  defineFunction({
    name: 'NOT',
    min: 1,
    max: 1,
    lift: [0],
    evaluate: (args) => booleanValue(!args.logical(0)),
  }),
  defineFunction({ name: 'TRUE', min: 0, max: 0, evaluate: () => booleanValue(true) }),
  defineFunction({ name: 'FALSE', min: 0, max: 0, evaluate: () => booleanValue(false) }),
  defineFunction({
    name: 'IFERROR',
    min: 2,
    max: 2,
    lift: [0],
    broadcast: [0, 1],
    evaluate: (args) =>
      args.scalar(0).kind === CellValueKind.Error ? args.value(1) : args.value(0),
  }),
  defineFunction({
    name: 'IFNA',
    min: 2,
    max: 2,
    lift: [0],
    broadcast: [0, 1],
    evaluate: (args) => {
      const value = args.scalar(0);

      return value.kind === CellValueKind.Error && value.code === CellError.Na
        ? args.value(1)
        : args.value(0);
    },
  }),
  defineFunction({ name: 'SWITCH', min: 3, max: MANY, lift: [0], evaluate: switched }),
];
