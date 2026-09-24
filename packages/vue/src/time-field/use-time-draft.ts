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
  type HourCycle,
  type TimeDraft,
  type TimeLayout,
  type TimeSegmentType,
  type TimeValue,
} from '@numior/primitives';

export type TimePeriod = 'am' | 'pm';
export type TimeEdge = 'min' | 'max';

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
  setPeriod(period: TimePeriod): void;
  clear(type: TimeSegmentType): void;
  shift(minutes: number): void;
  setTime(time: TimeValue): void;
  settle(): void;
}

const withValue = (current: TimeDraft, type: TimeSegmentType, value: number | null): TimeDraft => {
  if (type === 'hour') {
    return { ...current, hour: value };
  }
  if (type === 'minute') {
    return { ...current, minute: value };
  }
  if (type === 'second') {
    return { ...current, second: value };
  }
  return { ...current, period: value === null ? null : value >= 12 ? 'pm' : 'am' };
};

const segmentValue = (current: TimeDraft, type: TimeSegmentType): number | null => {
  if (type === 'hour') {
    return current.hour;
  }
  if (type === 'minute') {
    return current.minute;
  }
  if (type === 'second') {
    return current.second;
  }
  return current.period === null ? null : current.period === 'pm' ? 12 : 0;
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
  const typing: { type: TimeSegmentType | null; count: number } = { type: null, count: 0 };
  let lastEmitted = options.model.value;

  const publish = (next: TimeDraft): void => {
    draft.value = next;
    const time = draftToTime(next, cycle(), options.seconds());
    lastEmitted = time ? formatTimeModel(time, options.seconds()) : null;
    options.model.value = lastEmitted;
  };
  const resetTyping = (): void => {
    typing.type = null;
    typing.count = 0;
  };
  const setTime = (time: TimeValue): void => {
    resetTyping();
    publish(timeToDraft(time, cycle()));
  };
  const complete = (): TimeValue | null => draftToTime(draft.value, cycle(), options.seconds());

  const typeDigit = (type: TimeSegmentType, digit: number): boolean => {
    if (type === 'dayPeriod') {
      return false;
    }
    if (typing.type !== type) {
      typing.type = type;
      typing.count = 0;
    }
    const entry = { value: segmentValue(draft.value, type), typed: typing.count };
    const result = enterDigit(entry, digit, segmentBounds(type, cycle()));
    typing.count = result.advance ? 0 : result.typed;
    publish(withValue(draft.value, type, result.value));
    return result.advance;
  };
  const step = (type: TimeSegmentType, delta: number): void => {
    resetTyping();
    const current = segmentValue(draft.value, type);
    const next =
      type === 'dayPeriod'
        ? togglePeriod(current, delta)
        : stepSegment(current, delta, segmentBounds(type, cycle()));
    publish(withValue(draft.value, type, next));
  };
  const setEdge = (type: TimeSegmentType, edge: TimeEdge): void => {
    resetTyping();
    const bounds = segmentBounds(type, cycle());
    publish(withValue(draft.value, type, edge === 'min' ? bounds.min : bounds.max));
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
