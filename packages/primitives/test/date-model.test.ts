import { describe, expect, it } from 'vite-plus/test';
import {
  addDays,
  addMonthKeys,
  addMonths,
  addYears,
  clampIsoDate,
  compareIsoDates,
  daysInMonth,
  differenceInDays,
  endOfMonth,
  endOfWeek,
  firstOfMonth,
  formatIsoDate,
  isIsoDate,
  isWithin,
  isoWeekOf,
  joinDateTime,
  monthKeyOf,
  normalizeRange,
  parseIsoDate,
  splitDateTime,
  startOfMonth,
  startOfWeek,
  weekdayOf,
} from '../src';

describe('iso dates', () => {
  it('parses, validates and formats calendar dates without a time zone', () => {
    expect(parseIsoDate('2026-02-28')).toEqual({ year: 2026, month: 2, day: 28 });
    expect(parseIsoDate('2026-02-29')).toBeNull();
    expect(parseIsoDate('2024-02-29')).toEqual({ year: 2024, month: 2, day: 29 });
    expect(parseIsoDate('2026-13-01')).toBeNull();
    expect(parseIsoDate('26-01-01')).toBeNull();
    expect(parseIsoDate('')).toBeNull();
    expect(parseIsoDate(null)).toBeNull();
    expect(isIsoDate('2026-09-24')).toBe(true);
    expect(formatIsoDate({ year: 2026, month: 9, day: 4 })).toBe('2026-09-04');
    expect(compareIsoDates('2026-01-31', '2026-02-01')).toBeLessThan(0);
    expect(compareIsoDates('2026-02-01', '2026-02-01')).toBe(0);
  });

  it('clamps, checks bounds and normalises ranges', () => {
    expect(clampIsoDate('2026-01-01', '2026-01-10', '2026-01-20')).toBe('2026-01-10');
    expect(clampIsoDate('2026-02-01', '2026-01-10', '2026-01-20')).toBe('2026-01-20');
    expect(clampIsoDate('2026-01-15', null, undefined)).toBe('2026-01-15');
    expect(isWithin('2026-01-15', '2026-01-10', '2026-01-20')).toBe(true);
    expect(isWithin('2026-01-25', '2026-01-10', '2026-01-20')).toBe(false);

    expect(normalizeRange({ start: '2026-01-20', end: '2026-01-10' })).toEqual({
      start: '2026-01-10',
      end: '2026-01-20',
    });

    expect(normalizeRange({ start: '2026-01-10', end: null })).toEqual({
      start: '2026-01-10',
      end: null,
    });
  });
});

describe('date arithmetic', () => {
  it('adds days across month, year and DST boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(differenceInDays('2026-03-28', '2026-03-30')).toBe(2);
    expect(differenceInDays('2026-01-01', '2025-12-31')).toBe(-1);
  });

  it('adds months and years while clamping the day of month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2026-11-30', 3)).toBe('2027-02-28');
    expect(addMonths('2026-03-15', -3)).toBe('2025-12-15');
    expect(addYears('2024-02-29', 1)).toBe('2025-02-28');
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 12)).toBe(31);
  });

  it('resolves month boundaries and month keys', () => {
    expect(startOfMonth('2026-09-24')).toBe('2026-09-01');
    expect(endOfMonth('2026-09-24')).toBe('2026-09-30');
    expect(monthKeyOf('2026-09-24')).toBe('2026-09');
    expect(firstOfMonth('2026-09')).toBe('2026-09-01');
    expect(addMonthKeys('2026-12', 1)).toBe('2027-01');
    expect(addMonthKeys('2026-01', -1)).toBe('2025-12');
    expect(() => firstOfMonth('2026-9')).toThrow(RangeError);
    expect(() => addDays('2026-02-30', 1)).toThrow(RangeError);
  });
});

describe('weeks', () => {
  it('knows ISO weekdays, week boundaries for any week start and ISO week numbers', () => {
    expect(weekdayOf('2026-09-24')).toBe(4);
    expect(weekdayOf('2026-09-27')).toBe(7);
    expect(startOfWeek('2026-09-24', 1)).toBe('2026-09-21');
    expect(startOfWeek('2026-09-24', 7)).toBe('2026-09-20');
    expect(startOfWeek('2026-09-24', 6)).toBe('2026-09-19');
    expect(endOfWeek('2026-09-24', 1)).toBe('2026-09-27');
    expect(isoWeekOf('2026-01-01')).toBe(1);
    expect(isoWeekOf('2027-01-01')).toBe(53);
    expect(isoWeekOf('2024-12-30')).toBe(1);
    expect(isoWeekOf('2026-09-24')).toBe(39);
  });
});

describe('date times', () => {
  it('splits and joins date-time strings', () => {
    expect(splitDateTime('2026-09-24T09:30')).toEqual({ date: '2026-09-24', time: '09:30' });
    expect(splitDateTime('2026-09-24T09:30:15')).toEqual({ date: '2026-09-24', time: '09:30:15' });
    expect(splitDateTime('2026-02-30T09:30')).toBeNull();
    expect(splitDateTime('2026-09-24 09:30')).toBeNull();
    expect(splitDateTime(null)).toBeNull();
    expect(joinDateTime('2026-09-24', '09:30')).toBe('2026-09-24T09:30');
  });
});
