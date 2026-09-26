import { computed, ref, shallowRef, type ComputedRef, type Ref } from 'vue';
import { addMonthKeys } from '@numior/primitives';
import type { NuiCalendarView } from './calendar.types';

export interface CalendarViewOptions {
  readonly month: Ref<string | undefined>;
  readonly initial: string;
  readonly months: () => number;
}

type ViewState =
  | { readonly view: 'days' }
  | { readonly view: 'months' }
  | { readonly view: 'years'; readonly page: number | undefined };

export interface CalendarView {
  readonly view: ComputedRef<NuiCalendarView>;
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
  const state = shallowRef<ViewState>({ view: 'days' });
  const view = computed(() => state.value.view);
  const fallback = ref(options.initial);
  const slide = ref<'next' | 'prev'>();
  const month = computed(() => options.month.value ?? fallback.value);

  const visibleMonths = computed(() =>
    Array.from({ length: Math.max(1, options.months()) }, (_, offset) =>
      addMonthKeys(month.value, offset),
    ),
  );

  const yearPage = computed(() => {
    const current = state.value;
    const page = current.view === 'years' ? current.page : undefined;

    return page ?? Math.floor(yearOfKey(month.value) / YEARS_PER_PAGE) * YEARS_PER_PAGE;
  });

  const setMonth = (key: string): void => {
    if (key === month.value) {
      return;
    }

    slide.value = key > month.value ? 'next' : 'prev';
    fallback.value = key;
    options.month.value = key;
  };

  const setView = (next: NuiCalendarView): void => {
    state.value = next === 'years' ? { view: 'years', page: undefined } : { view: next };
  };

  const shift = (steps: number): void => {
    switch (state.value.view) {
      case 'years':
        state.value = { view: 'years', page: yearPage.value + steps * YEARS_PER_PAGE };
        break;
      case 'months':
        setMonth(addMonthKeys(month.value, steps * 12));
        break;
      case 'days':
        setMonth(addMonthKeys(month.value, steps));
        break;
    }
  };

  return { view, month, visibleMonths, yearPage, slide, setMonth, setView, shift };
};
