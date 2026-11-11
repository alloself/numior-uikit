import { TimeContext, TimeUnit } from './chart.types';

export interface TimeTicks {
  readonly unit: TimeUnit;
  readonly step: number;
  readonly values: readonly number[];
}

export interface TimeGrain {
  readonly unit: TimeUnit;
  readonly context: TimeContext;
}

interface Interval {
  readonly unit: TimeUnit;
  readonly step: number;
  readonly length: number;
}

const SECOND = 1000;

const MINUTE = 60 * SECOND;

const HOUR = 60 * MINUTE;

const DAY = 24 * HOUR;

const INTERVALS: readonly Interval[] = [
  ...[1, 5, 15, 30].map((step) => ({ unit: 'second' as const, step, length: step * SECOND })),
  ...[1, 5, 15, 30].map((step) => ({ unit: 'minute' as const, step, length: step * MINUTE })),
  ...[1, 3, 6, 12].map((step) => ({ unit: 'hour' as const, step, length: step * HOUR })),
  ...[1, 2].map((step) => ({ unit: 'day' as const, step, length: step * DAY })),
  { unit: 'week', step: 1, length: 7 * DAY },
  ...[1, 3, 6].map((step) => ({ unit: 'month' as const, step, length: step * 30 * DAY })),
  ...[1, 2, 5, 10, 25, 50, 100].map((step) => ({
    unit: 'year' as const,
    step,
    length: step * 365 * DAY,
  })),
];

const YEARS: Interval = { unit: 'year', step: 1, length: 365 * DAY };

const DAYS: Interval = { unit: 'day', step: 1, length: DAY };

const GRAINS: readonly Interval[] = [
  YEARS,
  { unit: 'month', step: 1, length: 28 * DAY },
  DAYS,
  { unit: 'hour', step: 1, length: HOUR },
  { unit: 'minute', step: 1, length: MINUTE },
];

const LONGEST: Interval = { unit: 'year', step: 1000, length: 1000 * 365 * DAY };

const floorTo = (value: number, interval: Interval): number => {
  const date = new Date(value);

  switch (interval.unit) {
    case TimeUnit.Year:
      return Date.UTC(Math.floor(date.getUTCFullYear() / interval.step) * interval.step, 0, 1);
    case TimeUnit.Month:
      return Date.UTC(
        date.getUTCFullYear(),
        Math.floor(date.getUTCMonth() / interval.step) * interval.step,
        1,
      );
    case TimeUnit.Week: {
      const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

      return day - ((date.getUTCDay() + 6) % 7) * DAY;
    }
    default:
      return Math.floor(value / interval.length) * interval.length;
  }
};

const advance = (value: number, interval: Interval): number => {
  const date = new Date(value);

  switch (interval.unit) {
    case TimeUnit.Year:
      return Date.UTC(date.getUTCFullYear() + interval.step, 0, 1);
    case TimeUnit.Month:
      return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + interval.step, 1);
    default:
      return value + interval.length;
  }
};

export const timeTicks = (min: number, max: number, count = 6): TimeTicks => {
  const span = Math.max(max - min, SECOND);

  const chosen = INTERVALS.find((candidate) => span / candidate.length <= count) ?? LONGEST;
  const values: number[] = [];

  for (let tick = floorTo(min, chosen); tick <= max; tick = advance(tick, chosen)) {
    if (tick < min) {
      continue;
    }

    values.push(tick);
  }
  return { unit: chosen.unit, step: chosen.step, values };
};

const apart = (moments: Float64Array, grain: Interval): boolean =>
  moments.every((moment, index) => {
    const previous = moments[index - 1];

    return (
      previous === undefined ||
      previous === moment ||
      floorTo(moment, grain) !== floorTo(previous, grain)
    );
  });

const closest = (moments: Float64Array): number =>
  moments.reduce((gap, moment, index) => {
    const previous = moments[index - 1];

    return previous === undefined || previous === moment ? gap : Math.min(gap, moment - previous);
  }, Number.POSITIVE_INFINITY);

const contextOf = (unit: TimeUnit, first: number, last: number): TimeContext => {
  if (unit === TimeUnit.Month || unit === TimeUnit.Year) {
    return TimeContext.None;
  }
  if (floorTo(first, YEARS) !== floorTo(last, YEARS)) {
    return TimeContext.Year;
  }

  const timed = unit !== TimeUnit.Day && unit !== TimeUnit.Week;

  return timed && floorTo(first, DAYS) !== floorTo(last, DAYS)
    ? TimeContext.Date
    : TimeContext.None;
};

export const timeGrain = (values: readonly number[]): TimeGrain => {
  const moments = Float64Array.from(values.filter(Number.isFinite)).toSorted();
  const [first = 0] = moments;
  const last = moments.at(-1) ?? first;
  const gap = closest(moments);

  const unit =
    GRAINS.find((grain) =>
      Number.isFinite(gap)
        ? grain.length <= gap && apart(moments, grain)
        : floorTo(first, grain) === first,
    )?.unit ?? TimeUnit.Second;

  return { unit, context: contextOf(unit, first, last) };
};
