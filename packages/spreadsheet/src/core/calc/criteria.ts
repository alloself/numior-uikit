import { CellValueKind, type CellValue } from '../cell.types';
import type { NumberLocale } from '../format/format.types';
import { compareValues, logicalFromText, numberFromText } from './coerce';
import { BinaryOperator } from '../formula/formula.types';
import { CriteriaToken } from './calc.types';

export type Criterion = (value: CellValue) => boolean;

type Operator = '=' | '<>' | '<' | '>' | '<=' | '>=';

const OPERATORS: readonly Operator[] = ['<=', '>=', '<>', '=', '<', '>'];

const WILDCARD = /~[*?~]|[*?]|[.+^${}()|[\]\\]/gu;

const wildcardToken = (token: string): string => {
  switch (token) {
    case CriteriaToken.AnyText:
      return '[\\s\\S]*';
    case CriteriaToken.AnyChar:
      return '[\\s\\S]';
    case CriteriaToken.EscapedTilde:
      return '~';
    case CriteriaToken.EscapedStar:
    case CriteriaToken.EscapedQuestion:
      return `\\${token.slice(1)}`;
    default:
      return `\\${token}`;
  }
};

export const wildcardSource = (text: string): string => text.replaceAll(WILDCARD, wildcardToken);

const wildcardPattern = (text: string): RegExp => new RegExp(`^${wildcardSource(text)}$`, 'iu');

const holds = (op: Operator, order: number): boolean => {
  switch (op) {
    case BinaryOperator.Equal:
      return order === 0;
    case BinaryOperator.NotEqual:
      return order !== 0;
    case BinaryOperator.Less:
      return order < 0;
    case BinaryOperator.Greater:
      return order > 0;
    case BinaryOperator.LessOrEqual:
      return order <= 0;
    default:
      return order >= 0;
  }
};

const numericOf = (value: CellValue, locale: NumberLocale): number | undefined => {
  switch (value.kind) {
    case CellValueKind.Number:
      return value.value;
    case CellValueKind.String:
      return numberFromText(value.value, locale);
    default:
      return undefined;
  }
};

const numberCriterion =
  (op: Operator, wanted: number, locale: NumberLocale): Criterion =>
  (value) => {
    const number = numericOf(value, locale);

    return number === undefined
      ? op === BinaryOperator.NotEqual
      : holds(op, Math.sign(number - wanted));
  };

const sameKind =
  (op: Operator, wanted: CellValue): Criterion =>
  (value) =>
    value.kind === wanted.kind
      ? holds(op, compareValues(value, wanted))
      : op === BinaryOperator.NotEqual;

const blankCriterion =
  (op: Operator): Criterion =>
  (value) => {
    const blank =
      value.kind === CellValueKind.Empty ||
      (value.kind === CellValueKind.String && value.value === '');

    return op === BinaryOperator.NotEqual ? !blank : op === BinaryOperator.Equal && blank;
  };

const textCriterion = (op: Operator, text: string): Criterion => {
  if (op !== BinaryOperator.Equal && op !== BinaryOperator.NotEqual) {
    return sameKind(op, { kind: 'string', value: text });
  }
  const pattern = wildcardPattern(text);

  return (value) => {
    const matches = value.kind === CellValueKind.String && pattern.test(value.value);

    return op === BinaryOperator.Equal ? matches : !matches;
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
    return (value) =>
      (value.kind === CellValueKind.Error && value.code === upper) ===
      (op !== BinaryOperator.NotEqual);
  }
  return textCriterion(op, operand);
};

export const parseCriterion = (criterion: CellValue, locale: NumberLocale): Criterion => {
  switch (criterion.kind) {
    case CellValueKind.Number:
      return numberCriterion('=', criterion.value, locale);
    case CellValueKind.Boolean:
      return sameKind('=', criterion);
    case CellValueKind.Error:
      return (value) => value.kind === CellValueKind.Error && value.code === criterion.code;
    case CellValueKind.Empty:
      return numberCriterion('=', 0, locale);
    case CellValueKind.String: {
      const op = OPERATORS.find((candidate) => criterion.value.startsWith(candidate));

      return op === undefined
        ? operandCriterion('=', criterion.value, locale)
        : operandCriterion(op, criterion.value.slice(op.length), locale);
    }
  }
};
