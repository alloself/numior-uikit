import {
  isPartialNumber,
  numberSymbols,
  parseDateText,
  parseIsoDate,
  parseNumber,
} from '@numior/primitives';
import type { BooleanTexts } from './table-format';
import {
  DatePart,
  NuiTableColumnType,
  type NuiTableCellValue,
  type NuiTableColumn,
  type ParsedCell,
} from './table.types';

const INVALID: ParsedCell = { kind: 'invalid' };
const EMPTY: ParsedCell = { kind: 'value', value: null };
const SIGNS = /[\p{Sc}%\s]/gu;
const TOKENS = /\p{L}+\.?|\d+/gu;
const DIGITS = /^\d+$/;
const TRUE_WORDS = new Set(['true', 'yes', 'да', '1', '+']);
const FALSE_WORDS = new Set(['false', 'no', 'нет', '0', '-']);
const months = new Map<string, readonly (readonly string[])[]>();

const valueOf = (value: NuiTableCellValue): ParsedCell => ({ kind: 'value', value });

const normalized = (word: string): string => word.toLocaleLowerCase().replaceAll('.', '');

const monthPart = (format: Intl.DateTimeFormat, month: number): string =>
  format.formatToParts(Date.UTC(2001, month, 15)).find((part) => part.type === DatePart.Month)
    ?.value ?? '';

const monthsOf = (locale: string): readonly (readonly string[])[] => {
  const cached = months.get(locale);

  if (cached !== undefined) {
    return cached;
  }

  const formats = (['short', 'long'] as const).flatMap((month) => [
    new Intl.DateTimeFormat(locale, { month, timeZone: 'UTC' }),
    new Intl.DateTimeFormat(locale, { day: 'numeric', month, year: 'numeric', timeZone: 'UTC' }),
  ]);

  const names = Array.from({ length: 12 }, (_, month) => [
    ...new Set(formats.map((format) => normalized(monthPart(format, month)))),
  ]);

  months.set(locale, names);
  return names;
};

const namedDate = (text: string, locale: string): number | null => {
  const tokens = text.match(TOKENS) ?? [];

  const numbers = tokens.reduce<number[]>((found, token) => {
    if (DIGITS.test(token)) {
      found.push(Number(token));
    }
    return found;
  }, []);

  const words = tokens.reduce<Set<string>>((found, token) => {
    if (!DIGITS.test(token)) {
      found.add(normalized(token));
    }
    return found;
  }, new Set());

  const month = monthsOf(locale).findIndex((names) => names.some((name) => words.has(name)));
  const year = numbers.find((value) => value >= 1000);
  const day = numbers.find((value) => value >= 1 && value <= 31);

  if (month < 0 || year === undefined || day === undefined) {
    return null;
  }
  const time = Date.UTC(year, month, day);

  return new Date(time).getUTCDate() === day ? time : null;
};

export const parseNumberCell = (text: string, locale: string): ParsedCell => {
  const bare = text.replace(SIGNS, '');

  if (bare === '') {
    return EMPTY;
  }
  const value = isPartialNumber(bare, numberSymbols(locale)) ? parseNumber(bare, locale) : null;

  return value === null ? INVALID : valueOf(value);
};

export const parseDateCell = (text: string, locale: string): ParsedCell => {
  const trimmed = text.trim();

  if (trimmed === '') {
    return EMPTY;
  }
  const parts = parseIsoDate(parseDateText(trimmed, locale));

  if (parts !== null) {
    return valueOf(new Date(Date.UTC(parts.year, parts.month - 1, parts.day)));
  }
  const time = namedDate(trimmed, locale);

  return time === null ? INVALID : valueOf(new Date(time));
};

export const parseBooleanCell = (text: string, texts: BooleanTexts): ParsedCell => {
  const word = text.trim().toLocaleLowerCase();

  if (word === '') {
    return EMPTY;
  }
  if (word === texts.yes.toLocaleLowerCase() || TRUE_WORDS.has(word)) {
    return valueOf(true);
  }
  return word === texts.no.toLocaleLowerCase() || FALSE_WORDS.has(word) ? valueOf(false) : INVALID;
};

export const parseCell = <T>(
  column: NuiTableColumn<T>,
  text: string,
  row: T,
  locale: string,
  texts: BooleanTexts,
): ParsedCell => {
  if (column.parse !== undefined) {
    const value = column.parse(text, row);
    return value === undefined ? INVALID : valueOf(value);
  }
  switch (column.type) {
    case NuiTableColumnType.Text:
      return text === '' ? EMPTY : valueOf(text);
    case NuiTableColumnType.Number:
      return parseNumberCell(text, locale);
    case NuiTableColumnType.Date:
      return parseDateCell(text, locale);
    case NuiTableColumnType.Boolean:
      return parseBooleanCell(text, texts);
  }
};
