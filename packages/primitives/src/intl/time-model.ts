import type { HourCycle } from './time-segments';

export interface TimeValue {
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}

export interface TimeOptionsInput {
  readonly step: number;
  readonly min: TimeValue | null;
  readonly max: TimeValue | null;
}

const TIME_PATTERN = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
const DAY_SECONDS = 86_400;
const MAX_OPTIONS = 1440;
const labelFormatters = new Map<string, Intl.DateTimeFormat>();

const pad = (value: number): string => String(value).padStart(2, '0');

const toSeconds = (time: TimeValue): number => time.hour * 3600 + time.minute * 60 + time.second;

const fromSeconds = (total: number): TimeValue => ({
  hour: Math.floor(total / 3600),
  minute: Math.floor((total % 3600) / 60),
  second: total % 60,
});

export const parseTime = (text: string | null | undefined): TimeValue | null => {
  const match = TIME_PATTERN.exec(text ?? '');
  if (!match) {
    return null;
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] ?? '0');
  if (hour > 23 || minute > 59 || second > 59) {
    return null;
  }
  return { hour, minute, second };
};

export const formatTimeModel = (time: TimeValue, seconds: boolean): string =>
  `${pad(time.hour)}:${pad(time.minute)}${seconds ? `:${pad(time.second)}` : ''}`;

export const compareTime = (a: TimeValue, b: TimeValue): number => toSeconds(a) - toSeconds(b);

export const clampTime = (
  time: TimeValue,
  min: TimeValue | null,
  max: TimeValue | null,
): TimeValue => {
  if (min && compareTime(time, min) < 0) {
    return min;
  }
  if (max && compareTime(time, max) > 0) {
    return max;
  }
  return time;
};

export const shiftTime = (time: TimeValue, minutes: number): TimeValue =>
  fromSeconds(Math.min(DAY_SECONDS - 1, Math.max(0, toSeconds(time) + minutes * 60)));

export const timeOptions = (input: TimeOptionsInput): TimeValue[] => {
  const size = Math.max(1, Math.floor(input.step)) * 60;
  const start = input.min ? toSeconds(input.min) : 0;
  const end = input.max ? toSeconds(input.max) : DAY_SECONDS - 60;
  const options: TimeValue[] = [];
  for (let at = start; at <= end && options.length < MAX_OPTIONS; at += size) {
    options.push(fromSeconds(at));
  }
  return options;
};

export const formatTimeLabel = (
  time: TimeValue,
  locale: string,
  cycle: HourCycle,
  seconds: boolean,
): string => {
  const key = `${locale}|${cycle}|${seconds ? 's' : 'm'}`;
  let formatter = labelFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      ...(seconds ? { second: '2-digit' } : {}),
      hourCycle: cycle,
      timeZone: 'UTC',
    });
    labelFormatters.set(key, formatter);
  }
  return formatter.format(new Date(Date.UTC(2000, 0, 1, time.hour, time.minute, time.second)));
};
