import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { normalizeRange, type DateRange } from '@numior/primitives';
import { NuiCalendarMode, type NuiCalendarValue, type NuiDatePreset } from './calendar.types';
import { isDateRange, selectedDatesOf } from './day-state';

export interface CalendarSelectionOptions {
  readonly model: Ref<NuiCalendarValue>;
  readonly mode: () => NuiCalendarMode;
  readonly today: () => string | undefined;
}

export interface CalendarSelection {
  readonly selected: ComputedRef<ReadonlySet<string>>;
  readonly range: ComputedRef<DateRange | null>;
  readonly picking: ComputedRef<boolean>;
  readonly preview: ComputedRef<DateRange | null>;
  readonly hovered: Ref<string | undefined>;
  pick(date: string): NuiCalendarValue;
  click(date: string): NuiCalendarValue | undefined;
  arm(date: string): NuiCalendarValue | undefined;
  release(date: string): NuiCalendarValue | undefined;
  clearArm(): void;
  resolvePreset(preset: NuiDatePreset): DateRange | null;
  isPresetActive(preset: NuiDatePreset): boolean;
}

const sameRange = (a: DateRange | null, b: DateRange): boolean =>
  a !== null && a.start === b.start && a.end === b.end;

export const useCalendarSelection = (options: CalendarSelectionOptions): CalendarSelection => {
  const hovered = ref<string>();
  const armed = ref<string>();
  const selected = computed(() => new Set(selectedDatesOf(options.model.value)));

  const range = computed(() =>
    options.mode() === NuiCalendarMode.Range && isDateRange(options.model.value)
      ? options.model.value
      : null,
  );

  const picking = computed(() => Boolean(range.value?.start) && range.value?.end === null);

  const preview = computed(() =>
    picking.value && range.value?.start && hovered.value
      ? normalizeRange({ start: range.value.start, end: hovered.value })
      : null,
  );

  const toggleMultiple = (date: string): string[] => {
    const current = selectedDatesOf(options.model.value);

    return current.includes(date)
      ? current.filter((entry) => entry !== date)
      : [...current, date].toSorted();
  };

  const nextRange = (date: string): NuiCalendarValue => {
    const current = range.value;

    return current?.start && !current.end
      ? normalizeRange({ start: current.start, end: date })
      : { start: date, end: null };
  };

  const nextValue = (date: string): NuiCalendarValue => {
    switch (options.mode()) {
      case NuiCalendarMode.Single:
        return date;
      case NuiCalendarMode.Multiple:
        return toggleMultiple(date);
      case NuiCalendarMode.Range:
        return nextRange(date);
    }
  };

  const pick = (date: string): NuiCalendarValue => {
    const value = nextValue(date);

    options.model.value = value;

    return value;
  };

  const click = (date: string): NuiCalendarValue | undefined => {
    if (armed.value === date) {
      armed.value = undefined;

      return undefined;
    }

    return pick(date);
  };

  const arm = (date: string): NuiCalendarValue | undefined => {
    if (options.mode() !== NuiCalendarMode.Range || picking.value) {
      return undefined;
    }

    armed.value = date;

    return pick(date);
  };

  const release = (date: string): NuiCalendarValue | undefined => {
    if (armed.value === undefined || armed.value === date || !picking.value) {
      return undefined;
    }

    armed.value = undefined;

    return pick(date);
  };

  const resolvePreset = (preset: NuiDatePreset): DateRange | null => {
    if (typeof preset.range !== 'function') {
      return preset.range;
    }

    const today = options.today();

    return today === undefined ? null : preset.range(today);
  };

  return {
    selected,
    range,
    picking,
    preview,
    hovered,
    pick,
    click,
    arm,
    release,
    clearArm: () => {
      armed.value = undefined;
    },
    resolvePreset,
    isPresetActive: (preset) => {
      const resolved = resolvePreset(preset);

      return resolved !== null && sameRange(range.value, resolved);
    },
  };
};
