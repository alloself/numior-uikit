import {
  clampTime,
  compareTime,
  formatSegment,
  type HourCycle,
  type TimeDraft,
  type TimeLayout,
  type TimeSegmentType,
  type TimeValue,
} from '@numior/primitives';

export interface WheelOption {
  readonly value: number;
  readonly text: string;
  readonly disabled: boolean;
}

export interface WheelColumn {
  readonly type: TimeSegmentType;
  readonly options: readonly WheelOption[];
  readonly selected: number;
  readonly separator: string | undefined;
}

export interface WheelInput {
  readonly layout: TimeLayout;
  readonly draft: TimeDraft;
  readonly seconds: boolean;
  readonly step: number;
  readonly min: TimeValue | null;
  readonly max: TimeValue | null;
}

interface MinuteWindow {
  readonly from: number;
  readonly to: number;
}

type Period = 'am' | 'pm';

const MIDNIGHT: TimeValue = { hour: 0, minute: 0, second: 0 };
const CLOSED: MinuteWindow = { from: 1, to: 0 };
const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const greatestDivisor = (left: number, right: number): number =>
  right === 0 ? left : greatestDivisor(right, left % right);

const every = (from: number, to: number, by: number): number[] => {
  const values: number[] = [];

  for (let value = from; value <= to; value += by) {
    values.push(value);
  }
  return values;
};

const periodOf = (hour: number): Period => (hour >= 12 ? 'pm' : 'am');

const toDayHour = (hour: number, period: Period, cycle: HourCycle): number =>
  cycle === 'h23' ? hour : (hour % 12) + (period === 'pm' ? 12 : 0);

const toCycleHour = (hour: number, cycle: HourCycle): number =>
  cycle === 'h23' ? hour : hour % 12 === 0 ? 12 : hour % 12;

const isWithin = (time: TimeValue, input: WheelInput): boolean =>
  (input.min === null || compareTime(time, input.min) >= 0) &&
  (input.max === null || compareTime(time, input.max) <= 0);

const lowestMinute = (hour: number, input: WheelInput): number => {
  if (input.min === null || hour > input.min.hour) {
    return 0;
  }
  return input.min.minute + (!input.seconds && input.min.second > 0 ? 1 : 0);
};

const minuteWindow = (hour: number, input: WheelInput): MinuteWindow => {
  if ((input.min && hour < input.min.hour) || (input.max && hour > input.max.hour)) {
    return CLOSED;
  }
  return {
    from: lowestMinute(hour, input),
    to: input.max && hour === input.max.hour ? input.max.minute : 59,
  };
};

export const minuteInterval = (step: number): number =>
  greatestDivisor(Math.max(1, Math.floor(step)), 60);

const reachable = (hour: number, input: WheelInput): boolean => {
  const window = minuteWindow(hour, input);
  const interval = minuteInterval(input.step);

  return Math.ceil(window.from / interval) * interval <= window.to;
};

const shownTime = (input: WheelInput): TimeValue => {
  const { draft, layout } = input;
  const fallback = clampTime(MIDNIGHT, input.min, input.max);
  const period = draft.period ?? periodOf(fallback.hour);

  return {
    hour: draft.hour === null ? fallback.hour : toDayHour(draft.hour, period, layout.cycle),
    minute: draft.minute ?? fallback.minute,
    second: input.seconds ? (draft.second ?? fallback.second) : 0,
  };
};

const nearestIndex = (options: readonly WheelOption[], value: number): number =>
  options.reduce(
    (best, option, index) =>
      Math.abs(option.value - value) < Math.abs((options[best]?.value ?? 0) - value) ? index : best,
    0,
  );

const floorIndex = (options: readonly WheelOption[], value: number): number =>
  Math.max(
    0,
    options.findLastIndex((option) => option.value <= value),
  );

const hourOptions = (input: WheelInput, shown: TimeValue): WheelOption[] => {
  const { cycle, digits } = input.layout;

  if (cycle === 'h23') {
    return every(0, 23, 1)
      .filter((hour) => reachable(hour, input))
      .map((hour) => ({ value: hour, text: formatSegment(hour, digits), disabled: false }));
  }

  const period = periodOf(shown.hour);

  return HOURS_12.filter(
    (hour) =>
      reachable(toDayHour(hour, 'am', cycle), input) ||
      reachable(toDayHour(hour, 'pm', cycle), input),
  ).map((hour) => ({
    value: hour,
    text: formatSegment(hour, digits),
    disabled: !reachable(toDayHour(hour, period, cycle), input),
  }));
};

const withValue = (values: number[], value: number): number[] =>
  values.includes(value) ? values : [...values, value].toSorted((left, right) => left - right);

const minuteOptions = (input: WheelInput, shown: TimeValue): WheelOption[] => {
  const window = minuteWindow(shown.hour, input);

  return withValue(every(0, 59, minuteInterval(input.step)), shown.minute).map((minute) => ({
    value: minute,
    text: formatSegment(minute, input.layout.digits),
    disabled: minute < window.from || minute > window.to,
  }));
};

const secondOptions = (input: WheelInput, shown: TimeValue): WheelOption[] =>
  every(0, 59, 1).map((second) => ({
    value: second,
    text: formatSegment(second, input.layout.digits),
    disabled: !isWithin({ ...shown, second }, input),
  }));

const periodOptions = (input: WheelInput): WheelOption[] =>
  (['am', 'pm'] as const).map((period, index) => ({
    value: period === 'pm' ? 12 : 0,
    text: input.layout.periods[index] ?? period,
    disabled: !HOURS_12.some((hour) => reachable(toDayHour(hour, period, 'h12'), input)),
  }));

const optionsOf = (type: TimeSegmentType, input: WheelInput, shown: TimeValue): WheelOption[] => {
  switch (type) {
    case 'hour':
      return hourOptions(input, shown);
    case 'minute':
      return minuteOptions(input, shown);
    case 'second':
      return secondOptions(input, shown);
    case 'dayPeriod':
      return periodOptions(input);
  }
};

const selectedIn = (
  type: TimeSegmentType,
  options: readonly WheelOption[],
  shown: TimeValue,
  cycle: HourCycle,
): number => {
  switch (type) {
    case 'hour':
      return nearestIndex(options, toCycleHour(shown.hour, cycle));
    case 'minute':
      return floorIndex(options, shown.minute);
    case 'second':
      return floorIndex(options, shown.second);
    case 'dayPeriod':
      return shown.hour >= 12 ? 1 : 0;
  }
};

const separatorsOf = (layout: TimeLayout): ReadonlyMap<TimeSegmentType, string> => {
  const separators = new Map<TimeSegmentType, string>();
  let literal: string | undefined;
  let numeric = false;

  for (const segment of layout.segments) {
    if (segment.type === 'literal') {
      literal = segment.text.trim();
    } else if (segment.type === 'dayPeriod') {
      numeric = false;
    } else {
      if (numeric && literal) {
        separators.set(segment.type, literal);
      }
      numeric = true;
      literal = undefined;
    }
  }
  return separators;
};

export const wheelColumns = (input: WheelInput): WheelColumn[] => {
  const shown = shownTime(input);
  const separators = separatorsOf(input.layout);

  return input.layout.segments.flatMap((segment) => {
    if (segment.type === 'literal') {
      return [];
    }

    const options = optionsOf(segment.type, input, shown);

    return [
      {
        type: segment.type,
        options,
        selected: selectedIn(segment.type, options, shown, input.layout.cycle),
        separator: separators.get(segment.type),
      },
    ];
  });
};

const withPart = (
  time: TimeValue,
  type: TimeSegmentType,
  value: number,
  cycle: HourCycle,
): TimeValue => {
  switch (type) {
    case 'hour':
      return { ...time, hour: toDayHour(value, periodOf(time.hour), cycle) };
    case 'minute':
      return { ...time, minute: value };
    case 'second':
      return { ...time, second: value };
    case 'dayPeriod':
      return { ...time, hour: (time.hour % 12) + (value >= 12 ? 12 : 0) };
  }
};

export const pickedTime = (input: WheelInput, type: TimeSegmentType, value: number): TimeValue =>
  clampTime(withPart(shownTime(input), type, value, input.layout.cycle), input.min, input.max);

export const settledTime = (input: WheelInput): TimeValue =>
  clampTime(shownTime(input), input.min, input.max);

const enabledFrom = (
  options: readonly WheelOption[],
  start: number,
  direction: 1 | -1,
): number | undefined => {
  for (let index = start; index >= 0 && index < options.length; index += direction) {
    if (options[index]?.disabled === false) {
      return index;
    }
  }
  return undefined;
};

export const nearestEnabled = (options: readonly WheelOption[], index: number): number => {
  for (let distance = 0; distance < options.length; distance += 1) {
    if (options[index - distance]?.disabled === false) {
      return index - distance;
    }
    if (options[index + distance]?.disabled === false) {
      return index + distance;
    }
  }
  return index;
};

type WheelMove = (options: readonly WheelOption[], selected: number) => number | undefined;

const PAGE = 5;

const WHEEL_MOVES: Readonly<Record<string, WheelMove>> = {
  ArrowUp: (options, selected) => enabledFrom(options, selected - 1, -1),
  ArrowDown: (options, selected) => enabledFrom(options, selected + 1, 1),
  PageUp: (options, selected) => enabledFrom(options, Math.max(0, selected - PAGE), -1),
  PageDown: (options, selected) =>
    enabledFrom(options, Math.min(options.length - 1, selected + PAGE), 1),
  Home: (options) => enabledFrom(options, 0, 1),
  End: (options) => enabledFrom(options, options.length - 1, -1),
};

export const wheelTarget = (
  key: string,
  options: readonly WheelOption[],
  selected: number,
): number | null => {
  const move = WHEEL_MOVES[key];
  return move === undefined ? null : (move(options, selected) ?? selected);
};

export const hasWheelTimes = (columns: readonly WheelColumn[]): boolean =>
  columns.length > 0 && columns.every((column) => column.options.length > 0);
