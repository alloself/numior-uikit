export interface DateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export interface DateRange {
  readonly start: string | null;
  readonly end: string | null;
}

const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (value: number, length: number): string => String(value).padStart(length, '0');

export const toUtc = (parts: DateParts): number => Date.UTC(parts.year, parts.month - 1, parts.day);

export const fromUtc = (time: number): DateParts => {
  const date = new Date(time);

  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
};

export const formatIsoDate = (parts: DateParts): string =>
  `${pad(parts.year, 4)}-${pad(parts.month, 2)}-${pad(parts.day, 2)}`;

export const partsOf = (parts: DateParts): DateParts | null => {
  const normalized = fromUtc(toUtc(parts));

  return normalized.year === parts.year &&
    normalized.month === parts.month &&
    normalized.day === parts.day
    ? normalized
    : null;
};

export const parseIsoDate = (text: string | null | undefined): DateParts | null => {
  const match = ISO_PATTERN.exec(text ?? '');

  if (!match) {
    return null;
  }

  return partsOf({ year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) });
};

export const isIsoDate = (text: string | null | undefined): boolean => parseIsoDate(text) !== null;

export const compareIsoDates = (a: string, b: string): number => {
  if (a === b) {
    return 0;
  }

  return a < b ? -1 : 1;
};

export const clampIsoDate = (
  date: string,
  min: string | null | undefined,
  max: string | null | undefined,
): string => {
  if (min && compareIsoDates(date, min) < 0) {
    return min;
  }

  if (max && compareIsoDates(date, max) > 0) {
    return max;
  }

  return date;
};

export const isWithin = (
  date: string,
  min: string | null | undefined,
  max: string | null | undefined,
): boolean => clampIsoDate(date, min, max) === date;

export const normalizeRange = (range: DateRange): DateRange =>
  range.start && range.end && compareIsoDates(range.start, range.end) > 0
    ? { start: range.end, end: range.start }
    : range;
