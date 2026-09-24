import { formatIsoDate, fromUtc, parseIsoDate, toUtc, type DateParts } from './iso';

const DAY_MS = 86_400_000;

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

const partsOrThrow = (date: string): DateParts => {
  const parts = parseIsoDate(date);

  if (!parts) {
    throw new RangeError(`Invalid ISO date: ${date}`);
  }

  return parts;
};

export const daysInMonth = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

export const addDays = (date: string, days: number): string =>
  formatIsoDate(fromUtc(toUtc(partsOrThrow(date)) + days * DAY_MS));

export const addMonths = (date: string, months: number): string => {
  const parts = partsOrThrow(date);
  const index = parts.year * 12 + (parts.month - 1) + months;
  const year = Math.floor(index / 12);
  const month = index - year * 12 + 1;

  return formatIsoDate({ year, month, day: Math.min(parts.day, daysInMonth(year, month)) });
};

export const addYears = (date: string, years: number): string => addMonths(date, years * 12);

export const startOfMonth = (date: string): string =>
  formatIsoDate({ ...partsOrThrow(date), day: 1 });

export const endOfMonth = (date: string): string => {
  const parts = partsOrThrow(date);

  return formatIsoDate({ ...parts, day: daysInMonth(parts.year, parts.month) });
};

export const monthKeyOf = (date: string): string => date.slice(0, 7);

export const firstOfMonth = (monthKey: string): string => {
  const match = MONTH_PATTERN.exec(monthKey);

  if (!match) {
    throw new RangeError(`Invalid month key: ${monthKey}`);
  }

  return formatIsoDate({ year: Number(match[1]), month: Number(match[2]), day: 1 });
};

export const addMonthKeys = (monthKey: string, months: number): string =>
  monthKeyOf(addMonths(firstOfMonth(monthKey), months));

export const differenceInDays = (from: string, to: string): number =>
  Math.round((toUtc(partsOrThrow(to)) - toUtc(partsOrThrow(from))) / DAY_MS);
