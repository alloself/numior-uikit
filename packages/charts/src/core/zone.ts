import type { TimeZone } from './chart.types';

interface Stretch {
  readonly from: number;
  readonly to: number;
  readonly offset: number;
}

type WallPart = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second';

const SECOND = 1000;

const MINUTE = 60 * SECOND;

const DAY = 24 * 60 * MINUTE;

const LATEST = 8.64e15 - DAY;

const REMEMBERED_DAYS = 50_000;

const WALL_PARTS: ReadonlySet<string> = new Set<WallPart>([
  'year',
  'month',
  'day',
  'hour',
  'minute',
  'second',
]);

const NOWHERE: Stretch = { from: 0, to: 0, offset: 0 };

export const UTC_ZONE: TimeZone = { name: 'UTC', offsetAt: () => 0 };

const zones = new Map<string, TimeZone>([['UTC', UTC_ZONE]]);

const isWallPart = (type: string): type is WallPart => WALL_PARTS.has(type);

const wallOf = (format: Intl.DateTimeFormat, instant: number): number => {
  const parts = format
    .formatToParts(instant)
    .reduce<Partial<Record<WallPart, number>>>((found, part) => {
      if (isWallPart(part.type)) {
        found[part.type] = Number(part.value);
      }
      return found;
    }, {});

  return Date.UTC(
    parts.year ?? 1970,
    (parts.month ?? 1) - 1,
    parts.day ?? 1,
    parts.hour ?? 0,
    parts.minute ?? 0,
    parts.second ?? 0,
  );
};

const stretchesOf = (offsetOf: (instant: number) => number, day: number): readonly Stretch[] => {
  const from = day * DAY;
  const to = from + DAY;
  const before = offsetOf(from);
  const after = offsetOf(to);

  if (before === after) {
    return [{ from, to, offset: before }];
  }

  let low = from;
  let high = to;

  while (high - low > MINUTE) {
    const middle = low + Math.floor((high - low) / (2 * MINUTE)) * MINUTE;

    if (offsetOf(middle) === before) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return [
    { from, to: high, offset: before },
    { from: high, to, offset: after },
  ];
};

const createZone = (name: string): TimeZone => {
  const format = new Intl.DateTimeFormat('en-US', {
    timeZone: name,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  });

  const days = new Map<number, readonly Stretch[]>();
  let last = NOWHERE;

  const offsetOf = (instant: number): number => {
    const whole = Math.floor(instant / SECOND) * SECOND;

    return wallOf(format, whole) - whole;
  };

  const stretchAt = (instant: number): Stretch => {
    const day = Math.floor(instant / DAY);
    const known = days.get(day);

    if (known !== undefined) {
      return known.find((stretch) => instant < stretch.to) ?? NOWHERE;
    }
    if (days.size >= REMEMBERED_DAYS) {
      days.clear();
    }

    const created = stretchesOf(offsetOf, day);

    days.set(day, created);
    return created.find((stretch) => instant < stretch.to) ?? NOWHERE;
  };

  return {
    name: format.resolvedOptions().timeZone,
    offsetAt: (instant) => {
      if (instant >= last.from && instant < last.to) {
        return last.offset;
      }
      if (!Number.isFinite(instant) || Math.abs(instant) > LATEST) {
        return 0;
      }

      last = stretchAt(instant);
      return last.offset;
    },
  };
};

export const timeZoneOf = (name: string | undefined): TimeZone => {
  const key = name ?? 'UTC';
  const known = zones.get(key);

  if (known !== undefined) {
    return known;
  }

  const created = createZone(key);

  zones.set(key, created);
  return created;
};

export const wallTime = (zone: TimeZone, instant: number): number =>
  instant + zone.offsetAt(instant);

const shows = (zone: TimeZone, instant: number, wall: number): boolean =>
  wallTime(zone, instant) === wall;

export const instantOf = (zone: TimeZone, wall: number): number => {
  const before = zone.offsetAt(wall - DAY);
  const after = zone.offsetAt(wall + DAY);

  if (before === after) {
    return wall - before;
  }

  const earlier = wall - Math.max(before, after);
  const later = wall - Math.min(before, after);

  if (shows(zone, earlier, wall)) {
    return earlier;
  }
  return shows(zone, later, wall) ? later : wall - before;
};
