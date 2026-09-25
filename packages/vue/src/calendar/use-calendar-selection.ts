import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { normalizeRange, type DateRange } from '@numior/primitives';
import type { NuiCalendarMode, NuiCalendarValue, NuiDatePreset } from './calendar.types';
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
  pick(date: string): void;
  click(date: string): void;
  arm(date: string): void;
  release(date: string): void;
  clearArm(): void;
  resolvePreset(preset: NuiDatePreset): DateRange;
  isPresetActive(preset: NuiDatePreset): boolean;
}

const sameRange = (a: DateRange | null, b: DateRange): boolean =>
  a !== null && a.start === b.start && a.end === b.end;

export const useCalendarSelection = (options: CalendarSelectionOptions): CalendarSelection => {
  const hovered = ref<string>();
  const armed = ref<string>();
  const selected = computed(() => new Set(selectedDatesOf(options.model.value)));

  const range = computed(() =>
    options.mode() === 'range' && isDateRange(options.model.value) ? options.model.value : null,
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

  const pick = (date: string): void => {
    const mode = options.mode();

    if (mode === 'single') {
      options.model.value = date;
    } else if (mode === 'multiple') {
      options.model.value = toggleMultiple(date);
    } else {
      const current = range.value;

      options.model.value =
        current?.start && !current.end
          ? normalizeRange({ start: current.start, end: date })
          : { start: date, end: null };
    }
  };

  const click = (date: string): void => {
    if (armed.value === date) {
      armed.value = undefined;

      return;
    }

    pick(date);
  };

  const arm = (date: string): void => {
    if (options.mode() === 'range' && !picking.value) {
      pick(date);
      armed.value = date;
    }
  };

  const release = (date: string): void => {
    if (armed.value !== undefined && armed.value !== date && picking.value) {
      pick(date);
      armed.value = undefined;
    }
  };

  const resolvePreset = (preset: NuiDatePreset): DateRange =>
    typeof preset.range === 'function' ? preset.range(options.today() ?? '') : preset.range;

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
    isPresetActive: (preset) => sameRange(range.value, resolvePreset(preset)),
  };
};
