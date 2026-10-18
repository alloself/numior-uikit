import type { CellValue } from '../cell.types';
import { compareValues, numberFromText } from './coerce';

export type Criterion = (value: CellValue) => boolean;

type Operator = '=' | '<>' | '<' | '>' | '<=' | '>=';

const OPERATORS: readonly Operator[] = ['<=', '>=', '<>', '=', '<', '>'];

const REGEX_SPECIAL = /[.+^${}()|[\]\\/]/u;

const wildcardPattern = (text: string): RegExp => {
  let pattern = '';

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] ?? '';
    const next = text[index + 1] ?? '';

    if (char === '~' && (next === '*' || next === '?' || next === '~')) {
      pattern += `\\${next}`;
      index += 1;
    } else if (char === '*') {
      pattern += '[\\s\\S]*';
    } else if (char === '?') {
      pattern += '[\\s\\S]';
    } else {
      pattern += REGEX_SPECIAL.test(char) ? `\\${char}` : char;
    }
  }
  return new RegExp(`^${pattern}$`, 'iu');
};

const holds = (op: Operator, order: number): boolean => {
  switch (op) {
    case '=':
      return order === 0;
    case '<>':
      return order !== 0;
    case '<':
      return order < 0;
    case '>':
      return order > 0;
    case '<=':
      return order <= 0;
    default:
      return order >= 0;
  }
};

const numericOf = (value: CellValue): number | undefined => {
  switch (value.kind) {
    case 'number':
      return value.value;
    case 'string':
      return numberFromText(value.value);
    default:
      return undefined;
  }
};

const numberCriterion =
  (op: Operator, wanted: number): Criterion =>
  (value) => {
    const number = numericOf(value);

    return number === undefined ? op === '<>' : holds(op, Math.sign(number - wanted));
  };

const sameKind =
  (op: Operator, wanted: CellValue): Criterion =>
  (value) =>
    value.kind === wanted.kind ? holds(op, compareValues(value, wanted)) : op === '<>';

const blankCriterion =
  (op: Operator): Criterion =>
  (value) => {
    const blank = value.kind === 'empty' || (value.kind === 'string' && value.value === '');

    return op === '<>' ? !blank : op === '=' && blank;
  };

const textCriterion = (op: Operator, text: string): Criterion => {
  if (op !== '=' && op !== '<>') {
    return sameKind(op, { kind: 'string', value: text });
  }
  const pattern = wildcardPattern(text);

  return (value) => {
    const matches = value.kind === 'string' && pattern.test(value.value);

    return op === '=' ? matches : !matches;
  };
};

const operandCriterion = (op: Operator, operand: string): Criterion => {
  const number = numberFromText(operand);
  const upper = operand.toUpperCase();

  if (operand === '') {
    return blankCriterion(op);
  }
  if (number !== undefined) {
    return numberCriterion(op, number);
  }
  if (upper === 'TRUE' || upper === 'FALSE') {
    return sameKind(op, { kind: 'boolean', value: upper === 'TRUE' });
  }
  if (upper.startsWith('#')) {
    return (value) => (value.kind === 'error' && value.code === upper) === (op !== '<>');
  }
  return textCriterion(op, operand);
};

export const parseCriterion = (criterion: CellValue): Criterion => {
  switch (criterion.kind) {
    case 'number':
      return numberCriterion('=', criterion.value);
    case 'boolean':
      return sameKind('=', criterion);
    case 'error':
      return (value) => value.kind === 'error' && value.code === criterion.code;
    case 'empty':
      return numberCriterion('=', 0);
    case 'string': {
      const op = OPERATORS.find((candidate) => criterion.value.startsWith(candidate));

      return op === undefined
        ? operandCriterion('=', criterion.value)
        : operandCriterion(op, criterion.value.slice(op.length));
    }
  }
};
