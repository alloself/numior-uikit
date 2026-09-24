import { afterEach, describe, expect, it } from 'vitest';
import {
  clampTime,
  draftToTime,
  enterDigit,
  formatSegment,
  formatTimeLabel,
  formatTimeModel,
  parseTime,
  resolveHourCycle,
  segmentBounds,
  segmentLabels,
  shiftTime,
  stepSegment,
  timeLayout,
  timeOptions,
  timeToDraft,
} from '../src';

const displayNames = Object.getOwnPropertyDescriptor(Intl, 'DisplayNames');
const at = (hour: number, minute: number, second = 0) => ({ hour, minute, second });

const types = (locale: string, seconds = false, hourCycle?: 'h12' | 'h23') =>
  timeLayout(locale, { seconds, hourCycle }).segments.map((segment) =>
    segment.type === 'literal' ? segment.text.replace(/\s/u, ' ') : segment.type,
  );

describe('time model', () => {
  it('parses, formats, compares and clamps plain time strings', () => {
    expect(parseTime('09:05')).toEqual(at(9, 5));
    expect(parseTime('23:59:59')).toEqual(at(23, 59, 59));
    expect(parseTime('24:00')).toBeNull();
    expect(parseTime('9:5')).toBeNull();
    expect(parseTime('')).toBeNull();
    expect(parseTime(null)).toBeNull();
    expect(formatTimeModel(at(9, 5), false)).toBe('09:05');
    expect(formatTimeModel(at(9, 5, 7), true)).toBe('09:05:07');
    expect(clampTime(at(8, 0), at(9, 0), at(18, 0))).toEqual(at(9, 0));
    expect(clampTime(at(19, 0), at(9, 0), at(18, 0))).toEqual(at(18, 0));
    expect(shiftTime(at(23, 50), 15)).toEqual(at(23, 59, 59));
    expect(shiftTime(at(0, 5), -15)).toEqual(at(0, 0));
    expect(shiftTime(at(9, 0), 30)).toEqual(at(9, 30));
  });

  it('lists options by step within the bounds and labels them per locale', () => {
    expect(timeOptions({ step: 30, min: at(9, 0), max: at(10, 0) })).toEqual([
      at(9, 0),
      at(9, 30),
      at(10, 0),
    ]);

    expect(timeOptions({ step: 15, min: null, max: null })).toHaveLength(96);
    expect(timeOptions({ step: 0, min: null, max: null })).toHaveLength(1440);
    expect(formatTimeLabel(at(13, 5), 'en-US', 'h12', false)).toBe('1:05 PM');
    expect(formatTimeLabel(at(13, 5), 'de-DE', 'h23', false)).toBe('13:05');
    expect(formatTimeLabel(at(13, 5), 'ar-EG', 'h12', false)).toMatch(/١:٠٥/);
  });
});

describe('time segments', () => {
  afterEach(() => {
    if (displayNames) {
      Object.defineProperty(Intl, 'DisplayNames', displayNames);
    }
  });

  it('resolves the hour cycle and lays out segments from the locale', () => {
    expect(resolveHourCycle('en-US')).toBe('h12');
    expect(resolveHourCycle('de-DE')).toBe('h23');
    expect(resolveHourCycle('ar-EG')).toBe('h12');
    expect(resolveHourCycle('en-US', 'h23')).toBe('h23');
    expect(types('en-US')).toEqual(['hour', ':', 'minute', ' ', 'dayPeriod']);
    expect(types('de-DE')).toEqual(['hour', ':', 'minute']);
    expect(types('da-DK')).toEqual(['hour', '.', 'minute']);
    expect(types('ko-KR')[0]).toBe('dayPeriod');
    expect(types('en-US', true)).toEqual(['hour', ':', 'minute', ':', 'second', ' ', 'dayPeriod']);
    expect(timeLayout('en-US', { seconds: false }).periods).toEqual(['AM', 'PM']);
    const arabic = timeLayout('ar-EG', { seconds: false });
    expect(arabic.digits[0]).toBe('٠');
    expect(arabic.periods).toEqual(['ص', 'م']);
  });

  it('accepts digits with auto-advance and steps with wrap-around', () => {
    const hours = segmentBounds('hour', 'h23');
    const first = enterDigit({ value: null, typed: 0 }, 1, hours);
    expect(first).toEqual({ value: 1, typed: 1, advance: false });
    expect(enterDigit(first, 5, hours)).toEqual({ value: 15, typed: 2, advance: true });
    expect(enterDigit({ value: null, typed: 0 }, 3, hours).advance).toBe(true);

    expect(enterDigit({ value: 2, typed: 1 }, 5, hours)).toEqual({
      value: 5,
      typed: 1,
      advance: true,
    });

    const minutes = segmentBounds('minute', 'h23');
    expect(enterDigit({ value: null, typed: 0 }, 6, minutes).advance).toBe(true);

    expect(enterDigit({ value: 5, typed: 1 }, 9, minutes)).toEqual({
      value: 59,
      typed: 2,
      advance: true,
    });

    const twelve = segmentBounds('hour', 'h12');
    expect(enterDigit({ value: null, typed: 0 }, 0, twelve).advance).toBe(false);
    expect(enterDigit({ value: null, typed: 0 }, 9, twelve).advance).toBe(true);

    expect(enterDigit({ value: 1, typed: 1 }, 2, twelve)).toEqual({
      value: 12,
      typed: 2,
      advance: true,
    });

    expect(stepSegment(23, 1, hours)).toBe(0);
    expect(stepSegment(12, 1, twelve)).toBe(1);
    expect(stepSegment(0, -1, minutes)).toBe(59);
    expect(stepSegment(null, 1, hours)).toBe(0);
    expect(stepSegment(null, -1, minutes)).toBe(59);
    expect(formatSegment(5, timeLayout('ar-EG', { seconds: false }).digits)).toBe('٠٥');
    expect(formatSegment(null, ['0'])).toBe('');
  });

  it('converts between drafts and times for both hour cycles', () => {
    expect(timeToDraft(at(0, 30), 'h12')).toEqual({
      hour: 12,
      minute: 30,
      second: 0,
      period: 'am',
    });

    expect(timeToDraft(at(12, 30), 'h12')).toEqual({
      hour: 12,
      minute: 30,
      second: 0,
      period: 'pm',
    });

    expect(timeToDraft(at(13, 0), 'h12').hour).toBe(1);
    expect(timeToDraft(at(13, 0), 'h23')).toEqual({ hour: 13, minute: 0, second: 0, period: null });
    expect(timeToDraft(null, 'h12').hour).toBeNull();

    expect(draftToTime({ hour: 12, minute: 30, second: null, period: 'am' }, 'h12', false)).toEqual(
      at(0, 30),
    );

    expect(draftToTime({ hour: 12, minute: 30, second: null, period: 'pm' }, 'h12', false)).toEqual(
      at(12, 30),
    );

    expect(draftToTime({ hour: 1, minute: 0, second: null, period: 'pm' }, 'h12', false)).toEqual(
      at(13, 0),
    );

    expect(
      draftToTime({ hour: 1, minute: 0, second: null, period: null }, 'h12', false),
    ).toBeNull();

    expect(
      draftToTime({ hour: 13, minute: null, second: null, period: null }, 'h23', false),
    ).toBeNull();

    expect(
      draftToTime({ hour: 13, minute: 5, second: null, period: null }, 'h23', true),
    ).toBeNull();

    expect(draftToTime({ hour: 13, minute: 5, second: null, period: null }, 'h23', false)).toEqual(
      at(13, 5),
    );
  });

  it('names segments through Intl.DisplayNames with an English fallback', () => {
    expect(segmentLabels('de-DE').hour).toBe('Stunde');
    expect(segmentLabels('en-US').dayPeriod).toBe('AM/PM');
    Object.defineProperty(Intl, 'DisplayNames', { value: undefined, configurable: true });

    expect(segmentLabels('de-DE')).toEqual({
      hour: 'hour',
      minute: 'minute',
      second: 'second',
      dayPeriod: 'AM/PM',
    });
  });
});
