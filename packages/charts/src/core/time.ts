import { TimeContext, TimeUnit, type TimeZone } from './chart.types';
import { instantOf, timeZoneOf, UTC_ZONE, wallTime } from './zone';

export interface TimeTicks {
  readonly unit: TimeUnit;
  readonly step: number;
  readonly values: readonly number[];
}

export interface TimeDomain extends TimeTicks {
  readonly min: number;
  readonly max: number;
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

const floorToCalendar = (value: number, interval: Interval): number => {
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
    default: {
      const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

      return day - ((date.getUTCDay() + 6) % 7) * DAY;
    }
  }
};

const floorWall = (wall: number, interval: Interval): number => {
  switch (interval.unit) {
    case TimeUnit.Year:
    case TimeUnit.Month:
    case TimeUnit.Week:
      return floorToCalendar(wall, interval);
    default:
      return Math.floor(wall / interval.length) * interval.length;
  }
};

const advanceWall = (wall: number, interval: Interval): number => {
  const date = new Date(wall);

  switch (interval.unit) {
    case TimeUnit.Year:
      return Date.UTC(date.getUTCFullYear() + interval.step, 0, 1);
    case TimeUnit.Month:
      return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + interval.step, 1);
    default:
      return wall + interval.length;
  }
};

const floorTo = (value: number, interval: Interval, zone: TimeZone): number =>
  instantOf(zone, floorWall(wallTime(zone, value), interval));

const intervalOf = (min: number, max: number, count: number): Interval => {
  const span = Math.max(max - min, SECOND);

  return INTERVALS.find((candidate) => span / candidate.length <= count) ?? LONGEST;
};

export const timeDomain = (min: number, max: number, count = 6, timeZone = 'UTC'): TimeDomain => {
  const zone = timeZoneOf(timeZone);
  const chosen = intervalOf(min, max, count);
  let wall = floorWall(wallTime(zone, min), chosen);
  let tick = instantOf(zone, wall);
  const values = [tick];

  while (tick < max) {
    wall = advanceWall(wall, chosen);
    tick = instantOf(zone, wall);

    if (tick <= (values.at(-1) ?? tick)) {
      continue;
    }

    values.push(tick);
  }
  return {
    min: values[0] ?? min,
    max: values.at(-1) ?? max,
    unit: chosen.unit,
    step: chosen.step,
    values,
  };
};

export const timeTicks = (min: number, max: number, count = 6, timeZone = 'UTC'): TimeTicks => {
  const zone = timeZoneOf(timeZone);
  const chosen = intervalOf(min, max, count);
  const values: number[] = [];
  let wall = floorWall(wallTime(zone, min), chosen);
  let tick = instantOf(zone, wall);

  while (tick <= max) {
    const placed = tick >= min && tick > (values.at(-1) ?? Number.NEGATIVE_INFINITY);

    if (placed) {
      values.push(tick);
    }

    wall = advanceWall(wall, chosen);
    tick = instantOf(zone, wall);
  }
  return { unit: chosen.unit, step: chosen.step, values };
};

const apart = (moments: Float64Array, grain: Interval, zone: TimeZone): boolean => {
  let previous = Number.NaN;
  let floor = Number.NaN;

  for (const moment of moments) {
    const current = floorTo(moment, grain, zone);
    const merged = moment !== previous && current === floor;

    if (merged) {
      return false;
    }

    previous = moment;
    floor = current;
  }
  return true;
};

const ordered = (moments: Float64Array): boolean =>
  moments.every((moment, index) => (moments[index - 1] ?? moment) <= moment);

const closest = (moments: Float64Array): number =>
  moments.reduce((gap, moment, index) => {
    const previous = moments[index - 1];

    return previous === undefined || previous === moment ? gap : Math.min(gap, moment - previous);
  }, Number.POSITIVE_INFINITY);

const contextOf = (unit: TimeUnit, first: number, last: number, zone: TimeZone): TimeContext => {
  if (unit === TimeUnit.Month || unit === TimeUnit.Year) {
    return TimeContext.None;
  }
  if (floorTo(first, YEARS, zone) !== floorTo(last, YEARS, zone)) {
    return TimeContext.Year;
  }

  const timed = unit !== TimeUnit.Day && unit !== TimeUnit.Week;

  return timed && floorTo(first, DAYS, zone) !== floorTo(last, DAYS, zone)
    ? TimeContext.Date
    : TimeContext.None;
};

export const timeGrain = (values: readonly number[], zone = UTC_ZONE): TimeGrain => {
  const finite = Float64Array.from(values.filter(Number.isFinite));
  const moments = ordered(finite) ? finite : finite.toSorted();
  const [first = 0] = moments;
  const last = moments.at(-1) ?? first;
  const gap = closest(moments);

  const unit =
    GRAINS.find((grain) =>
      Number.isFinite(gap)
        ? grain.length <= gap && apart(moments, grain, zone)
        : floorTo(first, grain, zone) === first,
    )?.unit ?? TimeUnit.Second;

  return { unit, context: contextOf(unit, first, last, zone) };
};
