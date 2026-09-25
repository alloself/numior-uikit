import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { addMonthKeys } from '@numior/primitives';
import type { NuiCalendarView } from './calendar.types';

export interface CalendarViewOptions {
  readonly month: Ref<string | undefined>;
  readonly initial: string;
  readonly months: () => number;
}

export interface CalendarView {
  readonly view: Ref<NuiCalendarView>;
  readonly month: ComputedRef<string>;
  readonly visibleMonths: ComputedRef<string[]>;
  readonly yearPage: ComputedRef<number>;
  readonly slide: Ref<'next' | 'prev' | undefined>;
  setMonth(key: string): void;
  setView(view: NuiCalendarView): void;
  shift(steps: number): void;
}

const YEARS_PER_PAGE = 12;

export const yearOfKey = (key: string): number => Number(key.slice(0, 4));

export const useCalendarView = (options: CalendarViewOptions): CalendarView => {
  const view = ref<NuiCalendarView>('days');
  const fallback = ref(options.initial);
  const page = ref<number>();
  const slide = ref<'next' | 'prev'>();
  const month = computed(() => options.month.value ?? fallback.value);

  const visibleMonths = computed(() =>
    Array.from({ length: Math.max(1, options.months()) }, (_, offset) =>
      addMonthKeys(month.value, offset),
    ),
  );

  const yearPage = computed(
    () => page.value ?? Math.floor(yearOfKey(month.value) / YEARS_PER_PAGE) * YEARS_PER_PAGE,
  );

  const setMonth = (key: string): void => {
    if (key === month.value) {
      return;
    }

    slide.value = key > month.value ? 'next' : 'prev';
    fallback.value = key;
    options.month.value = key;
  };

  const setView = (next: NuiCalendarView): void => {
    page.value = undefined;
    view.value = next;
  };

  const shift = (steps: number): void => {
    if (view.value === 'years') {
      page.value = yearPage.value + steps * YEARS_PER_PAGE;

      return;
    }

    setMonth(addMonthKeys(month.value, view.value === 'months' ? steps * 12 : steps));
  };

  return { view, month, visibleMonths, yearPage, slide, setMonth, setView, shift };
};
