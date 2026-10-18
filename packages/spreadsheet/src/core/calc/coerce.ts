import type { CellError, CellValue } from '../cell.types';

export class CellErrorSignal extends Error {
  readonly code: CellError;

  constructor(code: CellError) {
    super();
    this.code = code;
  }
}

const SIGNALS = new Map<CellError, CellErrorSignal>();

const NUMERIC = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?%?$/iu;

const COLLATOR = new Intl.Collator('en', { sensitivity: 'accent' });

const RANKS = { number: 0, string: 1, boolean: 2 } as const;

export const raise = (code: CellError): never => {
  const signal = SIGNALS.get(code) ?? new CellErrorSignal(code);

  SIGNALS.set(code, signal);
  throw signal;
};

export const numberFromText = (text: string): number | undefined => {
  const trimmed = text.trim();

  if (!NUMERIC.test(trimmed)) {
    return undefined;
  }
  return trimmed.endsWith('%') ? Number(trimmed.slice(0, -1)) / 100 : Number(trimmed);
};

const generalText = (value: number): string => {
  if (Number.isInteger(value) && Math.abs(value) < 1e15) {
    return String(value);
  }
  const [mantissa = '', exponent] = value.toPrecision(15).split('e');
  const digits = mantissa.includes('.') ? mantissa.replace(/\.?0+$/u, '') : mantissa;

  if (exponent === undefined) {
    return digits;
  }
  const power = Number(exponent);

  return `${digits}E${power < 0 ? '-' : '+'}${String(Math.abs(power)).padStart(2, '0')}`;
};

export const toNumber = (value: CellValue): number => {
  switch (value.kind) {
    case 'number':
      return value.value;
    case 'boolean':
      return value.value ? 1 : 0;
    case 'empty':
      return 0;
    case 'string':
      return numberFromText(value.value) ?? raise('#VALUE!');
    case 'error':
      return raise(value.code);
  }
};

export const toText = (value: CellValue): string => {
  switch (value.kind) {
    case 'number':
      return generalText(value.value);
    case 'boolean':
      return value.value ? 'TRUE' : 'FALSE';
    case 'empty':
      return '';
    case 'string':
      return value.value;
    case 'error':
      return raise(value.code);
  }
};

const logicalFromText = (text: string): boolean => {
  const upper = text.toUpperCase();

  return upper === 'TRUE' || (upper === 'FALSE' ? false : raise('#VALUE!'));
};

export const toLogical = (value: CellValue): boolean => {
  switch (value.kind) {
    case 'number':
      return value.value !== 0;
    case 'boolean':
      return value.value;
    case 'empty':
      return false;
    case 'string':
      return logicalFromText(value.value);
    case 'error':
      return raise(value.code);
  }
};

type Comparable = Exclude<CellValue, { readonly kind: 'empty' } | { readonly kind: 'error' }>;

const blankLike = (other: CellValue): Comparable => {
  switch (other.kind) {
    case 'string':
      return { kind: 'string', value: '' };
    case 'boolean':
      return { kind: 'boolean', value: false };
    default:
      return { kind: 'number', value: 0 };
  }
};

const comparable = (value: CellValue, other: CellValue): Comparable => {
  switch (value.kind) {
    case 'error':
      return raise(value.code);
    case 'empty':
      return blankLike(other);
    default:
      return value;
  }
};

const sameKind = (left: Comparable, right: Comparable): number => {
  if (left.kind === 'string' && right.kind === 'string') {
    return Math.sign(COLLATOR.compare(left.value, right.value));
  }
  const a = left.kind === 'string' ? 0 : Number(left.value);
  const b = right.kind === 'string' ? 0 : Number(right.value);

  return Math.sign(a - b);
};

export const compareValues = (left: CellValue, right: CellValue): number => {
  const a = comparable(left, right);
  const b = comparable(right, left);

  return a.kind === b.kind ? sameKind(a, b) : Math.sign(RANKS[a.kind] - RANKS[b.kind]);
};

export const lookupKey = (value: CellValue): string | undefined => {
  switch (value.kind) {
    case 'number':
      return `n${String(value.value)}`;
    case 'string':
      return `s${value.value.toUpperCase()}`;
    case 'boolean':
      return `b${String(value.value)}`;
    default:
      return undefined;
  }
};
