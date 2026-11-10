import { computed, ref, shallowRef, type ComputedRef, type Ref } from 'vue';
import { addMonthKeys } from '@numior/primitives';
import { CalendarSlide, NuiCalendarView } from './calendar.types';

export interface CalendarViewOptions {
  readonly month: Ref<string | undefined>;
  readonly initial: string;
  readonly months: () => number;
}

type ViewState =
  | { readonly view: typeof NuiCalendarView.Days }
  | { readonly view: typeof NuiCalendarView.Months }
  | { readonly view: typeof NuiCalendarView.Years; readonly page: number | undefined };

export interface CalendarView {
  readonly view: ComputedRef<NuiCalendarView>;
  readonly month: ComputedRef<string>;
  readonly visibleMonths: ComputedRef<string[]>;
  readonly yearPage: ComputedRef<number>;
  readonly slide: Ref<CalendarSlide | undefined>;
  setMonth(key: string): void;
  adopt(key: string): void;
  setView(view: NuiCalendarView): void;
  shift(steps: number): void;
}

const YEARS_PER_PAGE = 12;

export const yearOfKey = (key: string): number => Number(key.slice(0, 4));

export const useCalendarView = (options: CalendarViewOptions): CalendarView => {
  const state = shallowRef<ViewState>({ view: NuiCalendarView.Days });
  const view = computed(() => state.value.view);
  const fallback = ref(options.initial);
  const slide = ref<CalendarSlide>();
  const month = computed(() => options.month.value ?? fallback.value);

  const visibleMonths = computed(() =>
    Array.from({ length: Math.max(1, options.months()) }, (_, offset) =>
      addMonthKeys(month.value, offset),
    ),
  );

  const yearPage = computed(() => {
    const current = state.value;
    const page = current.view === NuiCalendarView.Years ? current.page : undefined;

    return page ?? Math.floor(yearOfKey(month.value) / YEARS_PER_PAGE) * YEARS_PER_PAGE;
  });

  const setMonth = (key: string): void => {
    if (key === month.value) {
      return;
    }

    slide.value = key > month.value ? CalendarSlide.Next : CalendarSlide.Prev;
    fallback.value = key;
    options.month.value = key;
  };

  const adopt = (key: string): void => {
    fallback.value = key;
  };

  const setView = (next: NuiCalendarView): void => {
    state.value =
      next === NuiCalendarView.Years
        ? { view: NuiCalendarView.Years, page: undefined }
        : { view: next };
  };

  const shift = (steps: number): void => {
    switch (state.value.view) {
      case NuiCalendarView.Years:
        state.value = {
          view: NuiCalendarView.Years,
          page: yearPage.value + steps * YEARS_PER_PAGE,
        };

        break;
      case NuiCalendarView.Months:
        setMonth(addMonthKeys(month.value, steps * 12));
        break;
      case NuiCalendarView.Days:
        setMonth(addMonthKeys(month.value, steps));
        break;
    }
  };

  return { view, month, visibleMonths, yearPage, slide, setMonth, adopt, setView, shift };
};
