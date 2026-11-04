import { BooleanText, CellValueKind, type CellValue } from '../cell.types';
import type { NumberLocale } from '../format/format.types';
import { readValueText } from '../format/read-value';
import { raise } from './signal';

export { CellErrorSignal, raise } from './signal';

type Comparable = Exclude<
  CellValue,
  { readonly kind: typeof CellValueKind.Empty } | { readonly kind: typeof CellValueKind.Error }
>;

const COLLATOR = new Intl.Collator('en', { sensitivity: 'accent' });

const RANKS = { number: 0, string: 1, boolean: 2 } as const;

export const numberFromText = (text: string, locale: NumberLocale): number | undefined =>
  readValueText(text, locale)?.value;

const generalText = (value: number, decimal: string): string => {
  if (Number.isInteger(value) && Math.abs(value) < 1e15) {
    return String(value);
  }
  const [mantissa = '', exponent] = value.toPrecision(15).split('e');
  const digits = mantissa.includes('.') ? mantissa.replace(/\.?0+$/u, '') : mantissa;

  if (exponent === undefined) {
    return digits.replace('.', decimal);
  }
  const power = Number(exponent);

  return `${digits.replace('.', decimal)}E${power < 0 ? '-' : '+'}${String(Math.abs(power)).padStart(2, '0')}`;
};

export const toNumber = (value: CellValue, locale: NumberLocale): number => {
  switch (value.kind) {
    case CellValueKind.Number:
      return value.value;
    case CellValueKind.Boolean:
      return value.value ? 1 : 0;
    case CellValueKind.Empty:
      return 0;
    case CellValueKind.String:
      return numberFromText(value.value, locale) ?? raise('#VALUE!');
    case CellValueKind.Error:
      return raise(value.code);
  }
};

export const toText = (value: CellValue, locale: NumberLocale): string => {
  switch (value.kind) {
    case CellValueKind.Number:
      return generalText(value.value, locale.decimal);
    case CellValueKind.Boolean:
      return value.value ? locale.trueText : locale.falseText;
    case CellValueKind.Empty:
      return '';
    case CellValueKind.String:
      return value.value;
    case CellValueKind.Error:
      return raise(value.code);
  }
};

export const logicalFromText = (text: string, locale: NumberLocale): boolean | undefined => {
  const upper = text.toUpperCase();

  if (upper === BooleanText.True || upper === locale.trueText) {
    return true;
  }
  return upper === BooleanText.False || upper === locale.falseText ? false : undefined;
};

export const toLogical = (value: CellValue, locale: NumberLocale): boolean => {
  switch (value.kind) {
    case CellValueKind.Number:
      return value.value !== 0;
    case CellValueKind.Boolean:
      return value.value;
    case CellValueKind.Empty:
      return false;
    case CellValueKind.String:
      return logicalFromText(value.value, locale) ?? raise('#VALUE!');
    case CellValueKind.Error:
      return raise(value.code);
  }
};

const blankLike = (other: CellValue): Comparable => {
  switch (other.kind) {
    case CellValueKind.String:
      return { kind: 'string', value: '' };
    case CellValueKind.Boolean:
      return { kind: 'boolean', value: false };
    default:
      return { kind: 'number', value: 0 };
  }
};

const comparable = (value: CellValue, other: CellValue): Comparable => {
  switch (value.kind) {
    case CellValueKind.Error:
      return raise(value.code);
    case CellValueKind.Empty:
      return blankLike(other);
    default:
      return value;
  }
};

const sameKind = (left: Comparable, right: Comparable): number => {
  if (left.kind === CellValueKind.String && right.kind === CellValueKind.String) {
    return Math.sign(COLLATOR.compare(left.value, right.value));
  }
  const a = left.kind === CellValueKind.String ? 0 : Number(left.value);
  const b = right.kind === CellValueKind.String ? 0 : Number(right.value);

  return Math.sign(a - b);
};

export const compareValues = (left: CellValue, right: CellValue): number => {
  const a = comparable(left, right);
  const b = comparable(right, left);

  return a.kind === b.kind ? sameKind(a, b) : Math.sign(RANKS[a.kind] - RANKS[b.kind]);
};

export const lookupKey = (value: CellValue): string | undefined => {
  switch (value.kind) {
    case CellValueKind.Number:
      return `n${String(value.value)}`;
    case CellValueKind.String:
      return `s${value.value.toUpperCase()}`;
    case CellValueKind.Boolean:
      return `b${String(value.value)}`;
    default:
      return undefined;
  }
};

const SORT_RANK: Readonly<Record<CellValue['kind'], number>> = {
  number: 0,
  string: 1,
  boolean: 2,
  error: 3,
  empty: 4,
};

const sortOrder = (left: CellValue, right: CellValue): number =>
  left.kind === right.kind && left.kind !== CellValueKind.Error && left.kind !== CellValueKind.Empty
    ? compareValues(left, right)
    : SORT_RANK[left.kind] - SORT_RANK[right.kind];

export const ordered =
  (direction: number) =>
  (left: CellValue, right: CellValue): number => {
    const blanks =
      Number(left.kind === CellValueKind.Empty) - Number(right.kind === CellValueKind.Empty);

    return blanks === 0 ? direction * sortOrder(left, right) : blanks;
  };
