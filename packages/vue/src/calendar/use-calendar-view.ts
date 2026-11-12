import { computed, ref, shallowRef, type ComputedRef, type Ref } from 'vue';
import { MAX_ISO_DATE, MIN_ISO_DATE, addMonthKeys, monthKeyOf } from '@numior/primitives';
import { clamp } from '@vueuse/core';
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

const FIRST_YEAR = yearOfKey(MIN_ISO_DATE);

const LAST_YEAR = yearOfKey(MAX_ISO_DATE);

const pageOf = (year: number): number => Math.floor(year / YEARS_PER_PAGE) * YEARS_PER_PAGE;

export const yearsOn = (page: number): number[] => {
  const first = Math.max(page, FIRST_YEAR);
  const last = Math.min(page + YEARS_PER_PAGE - 1, LAST_YEAR);

  return Array.from({ length: last - first + 1 }, (_, offset) => first + offset);
};

const earlier = (left: string, right: string): string => (left < right ? left : right);

export const useCalendarView = (options: CalendarViewOptions): CalendarView => {
  const state = shallowRef<ViewState>({ view: NuiCalendarView.Days });
  const view = computed(() => state.value.view);
  const fallback = ref(options.initial);
  const slide = ref<CalendarSlide>();
  const month = computed(() => options.month.value ?? fallback.value);

  const count = computed(() => Math.max(1, options.months()));
  const lastStart = computed(() => addMonthKeys(monthKeyOf(MAX_ISO_DATE), 1 - count.value));

  const visibleMonths = computed(() => {
    const start = earlier(month.value, lastStart.value);

    return Array.from({ length: count.value }, (_, offset) => addMonthKeys(start, offset));
  });

  const yearPage = computed(() => {
    const current = state.value;
    const page = current.view === NuiCalendarView.Years ? current.page : undefined;

    return page ?? pageOf(yearOfKey(month.value));
  });

  const setMonth = (key: string): void => {
    const next = earlier(key, lastStart.value);

    if (next === month.value) {
      return;
    }

    slide.value = next > month.value ? CalendarSlide.Next : CalendarSlide.Prev;
    fallback.value = next;
    options.month.value = next;
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
          page: clamp(
            yearPage.value + steps * YEARS_PER_PAGE,
            pageOf(FIRST_YEAR),
            pageOf(LAST_YEAR),
          ),
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
