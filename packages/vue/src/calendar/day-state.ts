import { compareIsoDates, normalizeRange, type DateRange } from '@numior/primitives';
import type { NuiCalendarValue, NuiDateRange } from './calendar.types';

export interface DayState {
  readonly outside: boolean;
  readonly today: boolean;
  readonly disabled: boolean;
  readonly selected: boolean;
  readonly start: boolean;
  readonly end: boolean;
  readonly middle: boolean;
  readonly preview: boolean;
}

export interface DayStateInput {
  readonly today: string | undefined;
  readonly disabled: boolean;
  readonly selected: ReadonlySet<string>;
  readonly range: DateRange | null;
  readonly preview: DateRange | null;
}

interface BandFlags {
  readonly inBand: boolean;
  readonly start: boolean;
  readonly end: boolean;
  readonly middle: boolean;
}

const NO_BAND: BandFlags = { inBand: false, start: false, end: false, middle: false };

export const isDateRange = (value: NuiCalendarValue): value is NuiDateRange =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const selectedDatesOf = (value: NuiCalendarValue): string[] => {
  if (value === null) {
    return [];
  }

  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return [...value];
  }

  return [value.start, value.end].flatMap((date) => (date === null ? [] : [date]));
};

type ValueShape = 'none' | 'single' | 'multiple' | 'range';

const shapeOf = (value: NuiCalendarValue): ValueShape => {
  if (value === null) {
    return 'none';
  }

  if (typeof value === 'string') {
    return 'single';
  }

  return Array.isArray(value) ? 'multiple' : 'range';
};

const partsOf = (value: NuiCalendarValue): readonly (string | null)[] => {
  if (value === null || typeof value === 'string') {
    return value === null ? [] : [value];
  }

  return Array.isArray(value) ? value : [value.start, value.end];
};

export const sameCalendarValue = (a: NuiCalendarValue, b: NuiCalendarValue): boolean => {
  const left = partsOf(a);
  const right = partsOf(b);

  return (
    shapeOf(a) === shapeOf(b) &&
    left.length === right.length &&
    left.every((part, index) => part === right[index])
  );
};

const bandOf = (input: DayStateInput): DateRange | null =>
  input.range?.start && input.range.end ? normalizeRange(input.range) : input.preview;

const bandFlags = (date: string, band: DateRange | null): BandFlags => {
  if (!band?.start || !band.end) {
    return NO_BAND;
  }

  if (compareIsoDates(date, band.start) < 0 || compareIsoDates(date, band.end) > 0) {
    return NO_BAND;
  }

  const start = date === band.start;
  const end = date === band.end;

  return { inBand: true, start, end, middle: !start && !end };
};

const openStart = (input: DayStateInput): string | undefined =>
  input.range?.start && !input.range.end ? input.range.start : undefined;

export const dayStateOf = (date: string, month: string, input: DayStateInput): DayState => {
  const band = bandOf(input);
  const flags = bandFlags(date, band);
  const previewing = flags.inBand && band === input.preview;

  return {
    outside: !date.startsWith(month),
    today: date === input.today,
    disabled: input.disabled,
    selected: input.selected.has(date) || (flags.inBand && !previewing),
    start: flags.start || date === openStart(input),
    end: flags.end,
    middle: flags.middle,
    preview: previewing,
  };
};
