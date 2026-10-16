import { graphemesOf } from './graphemes';
import { numberSymbols } from './number-format';
import type { TimeValue } from './time-model';

export type HourCycle = 'h12' | 'h23';

export type TimeSegmentType = 'hour' | 'minute' | 'second' | 'dayPeriod';

export type TimeSegment =
  | { readonly type: TimeSegmentType }
  | { readonly type: 'literal'; readonly text: string };

export interface TimeLayout {
  readonly cycle: HourCycle;
  readonly segments: readonly TimeSegment[];
  readonly periods: readonly [string, string];
  readonly digits: readonly string[];
}

export interface TimeLayoutOptions {
  readonly seconds: boolean;
  readonly hourCycle?: HourCycle | undefined;
}

export interface TimeDraft {
  readonly hour: number | null;
  readonly minute: number | null;
  readonly second: number | null;
  readonly period: 'am' | 'pm' | null;
}

export interface SegmentBounds {
  readonly min: number;
  readonly max: number;
}

export interface DigitEntry {
  readonly value: number | null;
  readonly typed: number;
}

export interface DigitResult {
  readonly value: number;
  readonly typed: number;
  readonly advance: boolean;
}

const EMPTY_DRAFT: TimeDraft = { hour: null, minute: null, second: null, period: null };

const FALLBACK_LABELS: Record<TimeSegmentType, string> = {
  hour: 'hour',
  minute: 'minute',
  second: 'second',
  dayPeriod: 'AM/PM',
};

const SAMPLE = new Date(Date.UTC(2000, 0, 1, 13, 5, 9));

const isSegmentType = (type: string): type is TimeSegmentType =>
  type === 'hour' || type === 'minute' || type === 'second' || type === 'dayPeriod';

export const resolveHourCycle = (locale: string, explicit?: HourCycle): HourCycle => {
  if (explicit) {
    return explicit;
  }
  const cycle = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hourCycle;
  return cycle === 'h11' || cycle === 'h12' ? 'h12' : 'h23';
};

const periodOf = (formatter: Intl.DateTimeFormat, hour: number): string | undefined =>
  formatter
    .formatToParts(new Date(Date.UTC(2000, 0, 1, hour, 0, 0)))
    .find((part) => part.type === 'dayPeriod')?.value;

export const timeLayout = (locale: string, options: TimeLayoutOptions): TimeLayout => {
  const cycle = resolveHourCycle(locale, options.hourCycle);

  const formatter = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    ...(options.seconds ? { second: '2-digit' } : {}),
    hourCycle: cycle,
    timeZone: 'UTC',
  });

  const segments = formatter.formatToParts(SAMPLE).flatMap((part): TimeSegment[] => {
    if (isSegmentType(part.type)) {
      return [{ type: part.type }];
    }
    return part.type === 'literal' ? [{ type: 'literal', text: part.value }] : [];
  });

  return {
    cycle,
    segments,
    periods: [periodOf(formatter, 1) ?? 'AM', periodOf(formatter, 13) ?? 'PM'],
    digits: numberSymbols(locale, {
      numberingSystem: formatter.resolvedOptions().numberingSystem,
    }).digits,
  };
};

export const timeToDraft = (time: TimeValue | null, cycle: HourCycle): TimeDraft => {
  if (!time) {
    return EMPTY_DRAFT;
  }
  if (cycle === 'h23') {
    return { hour: time.hour, minute: time.minute, second: time.second, period: null };
  }
  return {
    hour: time.hour % 12 === 0 ? 12 : time.hour % 12,
    minute: time.minute,
    second: time.second,
    period: time.hour >= 12 ? 'pm' : 'am',
  };
};

export const draftToTime = (
  draft: TimeDraft,
  cycle: HourCycle,
  seconds: boolean,
): TimeValue | null => {
  if (draft.hour === null || draft.minute === null || (seconds && draft.second === null)) {
    return null;
  }
  const second = draft.second ?? 0;
  if (cycle === 'h23') {
    return { hour: draft.hour, minute: draft.minute, second };
  }
  if (draft.period === null) {
    return null;
  }
  const base = draft.hour % 12;
  return { hour: draft.period === 'pm' ? base + 12 : base, minute: draft.minute, second };
};

export const segmentBounds = (type: TimeSegmentType, cycle: HourCycle): SegmentBounds => {
  if (type === 'hour') {
    return cycle === 'h12' ? { min: 1, max: 12 } : { min: 0, max: 23 };
  }
  return type === 'dayPeriod' ? { min: 0, max: 12 } : { min: 0, max: 59 };
};

export const enterDigit = (
  entry: DigitEntry,
  digit: number,
  bounds: SegmentBounds,
): DigitResult => {
  let value = entry.typed === 0 ? digit : (entry.value ?? 0) * 10 + digit;
  let typed = entry.typed + 1;
  if (value > bounds.max) {
    value = digit;
    typed = 1;
  }
  const complete = typed >= 2 || value * 10 > bounds.max;
  return { value, typed, advance: complete && value >= bounds.min };
};

export const stepSegment = (value: number | null, delta: number, bounds: SegmentBounds): number => {
  if (value === null) {
    return delta > 0 ? bounds.min : bounds.max;
  }
  const span = bounds.max - bounds.min + 1;
  return bounds.min + ((((value - bounds.min + delta) % span) + span) % span);
};

export const formatSegment = (value: number | null, digits: readonly string[]): string =>
  value === null
    ? ''
    : graphemesOf(String(value).padStart(2, '0'))
        .map((digit) => digits[Number(digit)] ?? digit)
        .join('');

export const segmentLabels = (locale: string): Record<TimeSegmentType, string> => {
  try {
    const names = new Intl.DisplayNames(locale, { type: 'dateTimeField' });
    return {
      hour: names.of('hour') ?? FALLBACK_LABELS.hour,
      minute: names.of('minute') ?? FALLBACK_LABELS.minute,
      second: names.of('second') ?? FALLBACK_LABELS.second,
      dayPeriod: names.of('dayPeriod') ?? FALLBACK_LABELS.dayPeriod,
    };
  } catch {
    return FALLBACK_LABELS;
  }
};
