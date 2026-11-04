import { parseNumber } from '../intl/number-format';
import { formatIsoDate, parseIsoDate, partsOf, toUtc } from './iso';
import { graphemesOf } from '../intl/graphemes';
import { DateTimePart } from '../intl/intl.types';
import { DateField } from './date.types';

export type DateTextPart =
  | { readonly type: DateField; readonly length: number }
  | { readonly type: typeof DateTimePart.Literal; readonly text: string };

const PATTERN_DATE = Date.UTC(2001, 10, 22);

const BIDI_MARKS = /[‎‏؜]/gu;

const DIGIT_GROUPS = /\p{Nd}+/gu;

const patterns = new Map<string, DateTextPart[]>();

const textFormatters = new Map<string, Intl.DateTimeFormat>();

const DATE_FIELDS: ReadonlySet<string> = new Set(Object.values(DateField));

const isDatePart = (type: string): type is DateField => DATE_FIELDS.has(type);

const formatterFor = (locale: string): Intl.DateTimeFormat => {
  let formatter = textFormatters.get(locale);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      calendar: 'gregory',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'UTC',
    });

    textFormatters.set(locale, formatter);
  }

  return formatter;
};

export const datePatternOf = (locale: string): DateTextPart[] => {
  let pattern = patterns.get(locale);

  if (!pattern) {
    pattern = formatterFor(locale)
      .formatToParts(PATTERN_DATE)
      .map((part) =>
        isDatePart(part.type)
          ? { type: part.type, length: graphemesOf(part.value).length }
          : { type: DateTimePart.Literal, text: part.value },
      );

    patterns.set(locale, pattern);
  }

  return pattern;
};

export const formatDateText = (date: string, locale: string): string => {
  const parts = parseIsoDate(date);

  return parts ? formatterFor(locale).format(toUtc(parts)) : '';
};

const fieldOrder = (locale: string): DateField[] =>
  datePatternOf(locale).flatMap((part) => (part.type === DateTimePart.Literal ? [] : [part.type]));

const digitGroups = (text: string): string[] =>
  [...text.replace(BIDI_MARKS, '').matchAll(DIGIT_GROUPS)].map((match) => match[0]);

const readField = (group: string, type: DateField, locale: string): number | null => {
  const value = parseNumber(group, locale);

  return type === DateField.Year && graphemesOf(group).length < 4 ? null : value;
};

const readFields = (groups: readonly string[], order: readonly DateField[], locale: string) => {
  const fields = { year: 0, month: 0, day: 0 };

  for (const [index, type] of order.entries()) {
    const value = readField(groups[index] ?? '', type, locale);

    if (value === null) {
      return null;
    }

    fields[type] = value;
  }

  return fields;
};

export const parseDateText = (text: string, locale: string): string | null => {
  const trimmed = text.trim();
  const iso = parseIsoDate(trimmed);

  if (iso) {
    return formatIsoDate(iso);
  }

  const groups = digitGroups(trimmed);
  const order = fieldOrder(locale);

  const fields =
    groups.length === 3 && order.length === 3 ? readFields(groups, order, locale) : null;

  const parts = fields ? partsOf(fields) : null;

  return parts ? formatIsoDate(parts) : null;
};
