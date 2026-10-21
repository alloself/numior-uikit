import type { CellValue } from '../cell.types';
import type { NumberLocale } from '../format/format.types';
import { compareValues, logicalFromText, numberFromText } from './coerce';

export type Criterion = (value: CellValue) => boolean;

type Operator = '=' | '<>' | '<' | '>' | '<=' | '>=';

const OPERATORS: readonly Operator[] = ['<=', '>=', '<>', '=', '<', '>'];

const WILDCARD = /~[*?~]|[*?]|[.+^${}()|[\]\\]/gu;

const wildcardToken = (token: string): string => {
  switch (token) {
    case '*':
      return '[\\s\\S]*';
    case '?':
      return '[\\s\\S]';
    case '~~':
      return '~';
    case '~*':
    case '~?':
      return `\\${token.slice(1)}`;
    default:
      return `\\${token}`;
  }
};

export const wildcardSource = (text: string): string => text.replaceAll(WILDCARD, wildcardToken);

const wildcardPattern = (text: string): RegExp => new RegExp(`^${wildcardSource(text)}$`, 'iu');

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

const numericOf = (value: CellValue, locale: NumberLocale): number | undefined => {
  switch (value.kind) {
    case 'number':
      return value.value;
    case 'string':
      return numberFromText(value.value, locale);
    default:
      return undefined;
  }
};

const numberCriterion =
  (op: Operator, wanted: number, locale: NumberLocale): Criterion =>
  (value) => {
    const number = numericOf(value, locale);

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

const operandCriterion = (op: Operator, operand: string, locale: NumberLocale): Criterion => {
  const number = numberFromText(operand, locale);
  const logical = logicalFromText(operand, locale);
  const upper = operand.toUpperCase();

  if (operand === '') {
    return blankCriterion(op);
  }
  if (number !== undefined) {
    return numberCriterion(op, number, locale);
  }
  if (logical !== undefined) {
    return sameKind(op, { kind: 'boolean', value: logical });
  }
  if (upper.startsWith('#')) {
    return (value) => (value.kind === 'error' && value.code === upper) === (op !== '<>');
  }
  return textCriterion(op, operand);
};

export const parseCriterion = (criterion: CellValue, locale: NumberLocale): Criterion => {
  switch (criterion.kind) {
    case 'number':
      return numberCriterion('=', criterion.value, locale);
    case 'boolean':
      return sameKind('=', criterion);
    case 'error':
      return (value) => value.kind === 'error' && value.code === criterion.code;
    case 'empty':
      return numberCriterion('=', 0, locale);
    case 'string': {
      const op = OPERATORS.find((candidate) => criterion.value.startsWith(candidate));

      return op === undefined
        ? operandCriterion('=', criterion.value, locale)
        : operandCriterion(op, criterion.value.slice(op.length), locale);
    }
  }
};
