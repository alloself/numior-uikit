import { addDays } from './arithmetic';
import { parseIsoDate, toUtc } from './iso';

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const WEEKDAYS: readonly Weekday[] = [7, 1, 2, 3, 4, 5, 6];

const DAY_MS = 86_400_000;

export const weekdayOf = (date: string): Weekday => {
  const parts = parseIsoDate(date);

  if (!parts) {
    throw new RangeError(`Invalid ISO date: ${date}`);
  }

  return WEEKDAYS[new Date(toUtc(parts)).getUTCDay()] ?? 1;
};

export const startOfWeek = (date: string, weekStart: Weekday): string =>
  addDays(date, -((weekdayOf(date) - weekStart + 7) % 7));

export const endOfWeek = (date: string, weekStart: Weekday): string =>
  addDays(startOfWeek(date, weekStart), 6);

export const isoWeekOf = (date: string): number => {
  const thursday = addDays(date, 4 - weekdayOf(date));
  const parts = parseIsoDate(thursday);

  if (!parts) {
    return 1;
  }

  const firstThursday = toUtc({ year: parts.year, month: 1, day: 4 });
  const weekOne = firstThursday - ((new Date(firstThursday).getUTCDay() + 6) % 7) * DAY_MS;

  return 1 + Math.round((toUtc(parts) - weekOne) / (7 * DAY_MS));
};
