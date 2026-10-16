import { describe, expect, it } from 'vite-plus/test';
import {
  datePatternOf,
  formatDateLabel,
  formatDateText,
  formatDayNumber,
  formatMonthLabel,
  monthLabels,
  parseDateText,
  weekStartOf,
  weekStartOfRegion,
  weekdayLabels,
} from '../src';

const REGION_LOCALES = ['en-US', 'ru-RU', 'de-DE', 'ar-EG', 'ja-JP', 'pt-BR', 'en-GB', 'he-IL'];

describe('date locale helpers', () => {
  it('derives the week start from Intl or the region table and keeps both in sync', () => {
    expect(weekStartOf('ru-RU')).toBe(1);
    expect(weekStartOf('de-DE')).toBe(1);
    expect(weekStartOf('en-US')).toBe(7);
    expect(weekStartOf('ar-EG')).toBe(6);
    expect(weekStartOf('en')).toBe(7);
    expect(weekStartOf('not a locale')).toBe(1);
    expect(weekStartOfRegion('US')).toBe(7);
    expect(weekStartOfRegion('EG')).toBe(6);
    expect(weekStartOfRegion(undefined)).toBe(1);

    for (const tag of REGION_LOCALES) {
      const locale = new Intl.Locale(tag).maximize();

      expect(weekStartOf(tag)).toBe(weekStartOfRegion(locale.region));
    }
  });

  it('labels weekdays from the week start, months and whole dates through Intl', () => {
    expect(weekdayLabels('ru-RU', 1)).toEqual(['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']);
    expect(weekdayLabels('en-US', 7, 'short')[0]).toBe('Sun');
    expect(weekdayLabels('en-US', 1, 'narrow')).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
    expect(monthLabels('en-US')[0]).toBe('January');
    expect(monthLabels('ru-RU', 'short')).toHaveLength(12);
    expect(formatDateLabel('2026-09-24', 'en-US')).toBe('Thursday, September 24, 2026');

    expect(formatDateLabel('2026-09-24', 'ru-RU', { day: 'numeric', month: 'long' })).toBe(
      '24 сентября',
    );

    expect(formatDateLabel('2026-02-30', 'en-US')).toBe('');
    expect(formatMonthLabel('2026-09', 'en-US')).toBe('September 2026');
    expect(formatDayNumber(5, 'en-US')).toBe('5');
    expect(formatDayNumber(5, 'ar-EG')).toBe('٥');
  });
});

describe('date text', () => {
  it('describes the numeric pattern of a locale and formats ISO dates with it', () => {
    expect(
      datePatternOf('ru-RU').map((part) => (part.type === 'literal' ? part.text : part.type)),
    ).toEqual(['day', '.', 'month', '.', 'year']);

    expect(
      datePatternOf('en-US').map((part) => (part.type === 'literal' ? part.text : part.type)),
    ).toEqual(['month', '/', 'day', '/', 'year']);

    expect(datePatternOf('ja-JP').map((part) => part.type)).toEqual([
      'year',
      'literal',
      'month',
      'literal',
      'day',
    ]);

    expect(formatDateText('2026-09-04', 'ru-RU')).toBe('04.09.2026');
    expect(formatDateText('2026-09-04', 'en-US')).toBe('09/04/2026');
    expect(formatDateText('2026-09-04', 'ja-JP')).toBe('2026/09/04');
    expect(formatDateText('2026-02-30', 'en-US')).toBe('');
  });

  it('parses localised text, local digits and ISO while rejecting partial input', () => {
    expect(parseDateText('24.09.2026', 'ru-RU')).toBe('2026-09-24');
    expect(parseDateText(' 4.9.2026 ', 'ru-RU')).toBe('2026-09-04');
    expect(parseDateText('09/24/2026', 'en-US')).toBe('2026-09-24');
    expect(parseDateText('2026/09/24', 'ja-JP')).toBe('2026-09-24');
    expect(parseDateText('2026-09-24', 'ru-RU')).toBe('2026-09-24');
    expect(parseDateText('٢٤/٠٩/٢٠٢٦', 'ar-EG')).toBe('2026-09-24');
    expect(parseDateText('24.09.26', 'ru-RU')).toBeNull();
    expect(parseDateText('24.09', 'ru-RU')).toBeNull();
    expect(parseDateText('31.02.2026', 'ru-RU')).toBeNull();
    expect(parseDateText('', 'ru-RU')).toBeNull();
  });

  it('formats and parses in the Gregorian calendar whatever the locale calendar is', () => {
    expect(formatDateText('2026-09-26', 'th-TH')).toContain('2026');
    expect(parseDateText(formatDateText('2026-09-26', 'th-TH'), 'th-TH')).toBe('2026-09-26');
    expect(parseDateText(formatDateText('2026-09-26', 'ar-SA'), 'ar-SA')).toBe('2026-09-26');
  });
});
