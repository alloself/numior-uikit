import { inject, provide, type ComputedRef, type InjectionKey, type Ref } from 'vue';
import type { Weekday } from '@numior/primitives';
import type {
  CalendarSlide,
  FocusRequest,
  NuiCalendarLabels,
  NuiCalendarMode,
  NuiCalendarView,
} from './calendar.types';
import type { DayState } from './day-state';

export interface RequestOptions {
  readonly focus?: FocusRequest | undefined;
}

export interface CalendarContext {
  readonly id: ComputedRef<string>;
  readonly locale: ComputedRef<string>;
  readonly weekStart: ComputedRef<Weekday>;
  readonly mode: () => NuiCalendarMode;
  readonly weekNumbers: () => boolean;
  readonly fixedWeeks: () => boolean;
  readonly showOutsideDays: () => boolean;
  readonly labels: () => NuiCalendarLabels;
  readonly view: ComputedRef<NuiCalendarView>;
  readonly month: ComputedRef<string>;
  readonly yearPage: ComputedRef<number>;
  readonly slide: Ref<typeof CalendarSlide.Next | typeof CalendarSlide.Prev | undefined>;
  readonly focused: Ref<string>;
  isRtl(): boolean;
  isDisabled(date: string): boolean;
  dayState(date: string, month: string): DayState;
  shift(steps: number): void;
  setView(view: NuiCalendarView): void;
  pickMonth(key: string): void;
  pickYear(year: number): void;
  request(date: string, options?: RequestOptions): void;
  click(date: string): void;
  hover(date: string | undefined): void;
  arm(date: string): void;
  release(date: string): void;
}

const CALENDAR_KEY: InjectionKey<CalendarContext> = Symbol('nui:calendar');

export const provideCalendar = (context: CalendarContext): void => {
  provide(CALENDAR_KEY, context);
};

export const useCalendar = (): CalendarContext => {
  const context = inject(CALENDAR_KEY, null);

  if (!context) {
    throw new Error('Calendar parts must be rendered inside NuiCalendar');
  }

  return context;
};
