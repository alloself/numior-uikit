import {
  clampTime,
  compareTime,
  DateTimePart,
  DayPeriod,
  formatSegment,
  HourCycle,
  TimeSegmentType,
  type TimeDraft,
  type TimeLayout,
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

type WheelMove = (options: readonly WheelOption[], selected: number) => number | undefined;

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

const periodOf = (hour: number): DayPeriod => (hour >= 12 ? DayPeriod.Pm : DayPeriod.Am);

const toDayHour = (hour: number, period: DayPeriod, cycle: HourCycle): number =>
  cycle === HourCycle.H23 ? hour : (hour % 12) + (period === DayPeriod.Pm ? 12 : 0);

const toCycleHour = (hour: number, cycle: HourCycle): number =>
  cycle === HourCycle.H23 ? hour : hour % 12 === 0 ? 12 : hour % 12;

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

  if (cycle === HourCycle.H23) {
    return every(0, 23, 1).reduce<WheelOption[]>((found, hour) => {
      if (reachable(hour, input)) {
        found.push({ value: hour, text: formatSegment(hour, digits), disabled: false });
      }
      return found;
    }, []);
  }

  const period = periodOf(shown.hour);

  return HOURS_12.reduce<WheelOption[]>((found, hour) => {
    if (
      reachable(toDayHour(hour, DayPeriod.Am, cycle), input) ||
      reachable(toDayHour(hour, DayPeriod.Pm, cycle), input)
    ) {
      found.push({
        value: hour,
        text: formatSegment(hour, digits),
        disabled: !reachable(toDayHour(hour, period, cycle), input),
      });
    }
    return found;
  }, []);
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
  ([DayPeriod.Am, DayPeriod.Pm] as const).map((period, index) => ({
    value: period === DayPeriod.Pm ? 12 : 0,
    text: input.layout.periods[index] ?? period,
    disabled: !HOURS_12.some((hour) => reachable(toDayHour(hour, period, HourCycle.H12), input)),
  }));

const optionsOf = (type: TimeSegmentType, input: WheelInput, shown: TimeValue): WheelOption[] => {
  switch (type) {
    case TimeSegmentType.Hour:
      return hourOptions(input, shown);
    case TimeSegmentType.Minute:
      return minuteOptions(input, shown);
    case TimeSegmentType.Second:
      return secondOptions(input, shown);
    case TimeSegmentType.DayPeriod:
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
    case TimeSegmentType.Hour:
      return nearestIndex(options, toCycleHour(shown.hour, cycle));
    case TimeSegmentType.Minute:
      return floorIndex(options, shown.minute);
    case TimeSegmentType.Second:
      return floorIndex(options, shown.second);
    case TimeSegmentType.DayPeriod:
      return shown.hour >= 12 ? 1 : 0;
  }
};

const separatorsOf = (layout: TimeLayout): ReadonlyMap<TimeSegmentType, string> => {
  const separators = new Map<TimeSegmentType, string>();
  let literal: string | undefined;
  let numeric = false;

  for (const segment of layout.segments) {
    if (segment.type === DateTimePart.Literal) {
      literal = segment.text.trim();
    } else if (segment.type === TimeSegmentType.DayPeriod) {
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
    if (segment.type === DateTimePart.Literal) {
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
    case TimeSegmentType.Hour:
      return { ...time, hour: toDayHour(value, periodOf(time.hour), cycle) };
    case TimeSegmentType.Minute:
      return { ...time, minute: value };
    case TimeSegmentType.Second:
      return { ...time, second: value };
    case TimeSegmentType.DayPeriod:
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
