import { ref, watch, type Ref } from 'vue';
import {
  clampTime,
  compareTime,
  draftToTime,
  enterDigit,
  formatTimeModel,
  parseTime,
  segmentBounds,
  shiftTime,
  stepSegment,
  timeToDraft,
  DayPeriod,
  TimeSegmentType,
  type HourCycle,
  type TimeDraft,
  type TimeLayout,
  type TimeValue,
} from '@numior/primitives';
import { TimeEdge } from './time-field.types';

export interface TimeDraftOptions {
  readonly model: Ref<string | null>;
  readonly layout: () => TimeLayout;
  readonly seconds: () => boolean;
  readonly min: () => TimeValue | null;
  readonly max: () => TimeValue | null;
}

export interface TimeDraftControl {
  readonly draft: Readonly<Ref<TimeDraft>>;
  valueOf(type: TimeSegmentType): number | null;
  typeDigit(type: TimeSegmentType, digit: number): boolean;
  step(type: TimeSegmentType, delta: number): void;
  setEdge(type: TimeSegmentType, edge: TimeEdge): void;
  setPeriod(period: DayPeriod): void;
  clear(type: TimeSegmentType): void;
  shift(minutes: number): void;
  setTime(time: TimeValue): void;
  settle(): void;
}

const withValue = (current: TimeDraft, type: TimeSegmentType, value: number | null): TimeDraft => {
  switch (type) {
    case TimeSegmentType.Hour:
      return { ...current, hour: value };
    case TimeSegmentType.Minute:
      return { ...current, minute: value };
    case TimeSegmentType.Second:
      return { ...current, second: value };
    case TimeSegmentType.DayPeriod:
      return {
        ...current,
        period: value === null ? null : value >= 12 ? DayPeriod.Pm : DayPeriod.Am,
      };
  }
};

const segmentValue = (current: TimeDraft, type: TimeSegmentType): number | null => {
  switch (type) {
    case TimeSegmentType.Hour:
      return current.hour;
    case TimeSegmentType.Minute:
      return current.minute;
    case TimeSegmentType.Second:
      return current.second;
    case TimeSegmentType.DayPeriod:
      return current.period === null ? null : current.period === DayPeriod.Pm ? 12 : 0;
  }
};

const togglePeriod = (current: number | null, delta: number): number => {
  if (current === null) {
    return delta > 0 ? 0 : 12;
  }
  return current === 12 ? 0 : 12;
};

export const useTimeDraft = (options: TimeDraftOptions): TimeDraftControl => {
  const cycle = (): HourCycle => options.layout().cycle;
  const fromModel = (): TimeDraft => timeToDraft(parseTime(options.model.value), cycle());
  const draft = ref<TimeDraft>(fromModel());
  let typing: { readonly segment: TimeSegmentType; readonly digits: number } | undefined;
  let lastEmitted = options.model.value;

  const publish = (next: TimeDraft): void => {
    draft.value = next;
    const time = draftToTime(next, cycle(), options.seconds());
    lastEmitted = time ? formatTimeModel(time, options.seconds()) : null;
    options.model.value = lastEmitted;
  };

  const resetTyping = (): void => {
    typing = undefined;
  };

  const setTime = (time: TimeValue): void => {
    resetTyping();
    publish(timeToDraft(time, cycle()));
  };

  const complete = (): TimeValue | null => draftToTime(draft.value, cycle(), options.seconds());

  const typeDigit = (type: TimeSegmentType, digit: number): boolean => {
    if (type === TimeSegmentType.DayPeriod) {
      return false;
    }
    const typed = typing?.segment === type ? typing.digits : 0;
    const entry = { value: segmentValue(draft.value, type), typed };
    const result = enterDigit(entry, digit, segmentBounds(type, cycle()));

    typing = { segment: type, digits: result.advance ? 0 : result.typed };
    publish(withValue(draft.value, type, result.value));
    return result.advance;
  };

  const step = (type: TimeSegmentType, delta: number): void => {
    resetTyping();
    const current = segmentValue(draft.value, type);

    const next =
      type === TimeSegmentType.DayPeriod
        ? togglePeriod(current, delta)
        : stepSegment(current, delta, segmentBounds(type, cycle()));

    publish(withValue(draft.value, type, next));
  };

  const setEdge = (type: TimeSegmentType, edge: TimeEdge): void => {
    resetTyping();
    const bounds = segmentBounds(type, cycle());
    publish(withValue(draft.value, type, edge === TimeEdge.Min ? bounds.min : bounds.max));
  };

  const shift = (minutes: number): void => {
    const time = complete();
    if (time) {
      setTime(clampTime(shiftTime(time, minutes), options.min(), options.max()));
    }
  };

  const settle = (): void => {
    resetTyping();
    const time = complete();
    if (!time) {
      return;
    }
    const clamped = clampTime(time, options.min(), options.max());
    if (compareTime(clamped, time) !== 0) {
      setTime(clamped);
    }
  };

  watch(options.model, (value) => {
    if (value !== lastEmitted) {
      lastEmitted = value;
      draft.value = fromModel();
    }
  });

  watch([cycle, () => options.seconds()], () => {
    draft.value = fromModel();
  });

  return {
    draft,
    valueOf: (type) => segmentValue(draft.value, type),
    typeDigit,
    step,
    setEdge,
    setPeriod: (period) => publish({ ...draft.value, period }),
    clear: (type) => {
      resetTyping();
      publish(withValue(draft.value, type, null));
    },
    shift,
    setTime,
    settle,
  };
};
