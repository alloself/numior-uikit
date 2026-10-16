import { graphemesOf } from '../intl/graphemes';

export type OtpCharset = 'digits' | 'alphanumeric';

export type OtpDirection = 'forward' | 'backward';

export interface OtpSelection {
  readonly start: number;
  readonly end: number;
}

export interface OtpEdit {
  readonly value: string;
  readonly caret: number;
}

const DECIMAL = /^\p{Nd}$/u;
const LATIN = /^[A-Za-z]$/;
const asciiDigits = new Map<string, string>();

const isDecimalAt = (code: number): boolean =>
  code >= 0 && DECIMAL.test(String.fromCodePoint(code));

const asciiDigitOf = (char: string): string | undefined => {
  const known = asciiDigits.get(char);
  const code = char.codePointAt(0);

  if (known !== undefined || code === undefined || !DECIMAL.test(char)) {
    return known;
  }
  let zero = code;
  while (isDecimalAt(zero - 1)) {
    zero -= 1;
  }
  const digit = String((code - zero) % 10);
  asciiDigits.set(char, digit);
  return digit;
};

const acceptChar = (char: string, charset: OtpCharset): string => {
  const plain = char.normalize('NFKC');
  const digit = graphemesOf(plain).length === 1 ? asciiDigitOf(plain) : undefined;

  if (digit !== undefined) {
    return digit;
  }
  return charset === 'alphanumeric' && LATIN.test(plain) ? plain.toUpperCase() : '';
};

export const normalizeOtp = (text: string, charset: OtpCharset): string => {
  let accepted = '';
  for (const char of text) {
    accepted += acceptChar(char, charset);
  }
  return accepted;
};

export const otpLength = (length: number): number =>
  Number.isFinite(length) ? Math.max(1, Math.floor(length)) : 1;

export const otpGroups = (length: number, groupSize?: number): readonly number[] => {
  const total = otpLength(length);
  const size = groupSize === undefined ? total : otpLength(groupSize);
  const groups: number[] = [];

  for (let rest = total; rest > 0; rest -= size) {
    groups.push(Math.min(size, rest));
  }
  return groups;
};

export const selectOtpSlot = (value: string, length: number, index: number): OtpSelection => {
  const total = otpLength(length);
  const filled = Math.min(value.length, total);

  if (filled === 0 || (filled < total && index >= filled)) {
    return { start: filled, end: filled };
  }
  const slot = Math.max(0, Math.min(index, filled - 1));
  return { start: slot, end: slot + 1 };
};

export const settleOtpCaret = (
  value: string,
  length: number,
  caret: number,
  direction: OtpDirection,
): OtpSelection =>
  selectOtpSlot(
    value,
    length,
    direction === 'backward' && caret < value.length ? caret - 1 : caret,
  );

export const reconcileOtp = (
  raw: string,
  caret: number,
  length: number,
  charset: OtpCharset,
): OtpEdit => {
  const value = normalizeOtp(raw, charset).slice(0, otpLength(length));
  const before = normalizeOtp(raw.slice(0, caret), charset).length;

  return { value, caret: Math.min(before, value.length) };
};

export const pasteOtp = (
  value: string,
  length: number,
  selection: OtpSelection,
  text: string,
  charset: OtpCharset,
): OtpEdit => {
  const total = otpLength(length);
  const accepted = normalizeOtp(text, charset);

  if (accepted.length >= total) {
    return { value: accepted.slice(0, total), caret: total };
  }
  const start = Math.min(selection.start, value.length);
  const tail = value.slice(Math.max(selection.end, start + accepted.length));
  const next = (value.slice(0, start) + accepted + tail).slice(0, total);

  return { value: next, caret: Math.min(start + accepted.length, next.length) };
};
