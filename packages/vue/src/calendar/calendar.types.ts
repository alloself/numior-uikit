import type { DateRange, Weekday } from '@numior/primitives';
import type { NuiSize } from '../shared/scale.types';

export type NuiCalendarMode = (typeof NuiCalendarMode)[keyof typeof NuiCalendarMode];

export type NuiCalendarView = (typeof NuiCalendarView)[keyof typeof NuiCalendarView];

export type CalendarPickerKind = Exclude<NuiCalendarView, typeof NuiCalendarView.Days>;

export type CalendarSlide = (typeof CalendarSlide)[keyof typeof CalendarSlide];

export type FocusRequest = (typeof FocusRequest)[keyof typeof FocusRequest];

export type NuiDateRange = DateRange;

export type NuiCalendarValue = string | string[] | NuiDateRange | null;

export interface NuiDatePreset {
  readonly label: string;
  readonly range: NuiDateRange | ((today: string) => NuiDateRange);
}

export interface NuiCalendarProps {
  id?: string | undefined;
  mode?: NuiCalendarMode | undefined;
  locale?: string | undefined;
  weekStart?: Weekday | undefined;
  min?: string | undefined;
  max?: string | undefined;
  isDateDisabled?: ((date: string) => boolean) | undefined;
  months?: number | undefined;
  weekNumbers?: boolean | undefined;
  fixedWeeks?: boolean | undefined;
  showOutsideDays?: boolean | undefined;
  showToday?: boolean | undefined;
  today?: string | undefined;
  presets?: readonly NuiDatePreset[] | undefined;
  size?: NuiSize | undefined;
  disabled?: boolean | undefined;
  previousLabel?: string | undefined;
  nextLabel?: string | undefined;
  monthLabel?: string | undefined;
  yearLabel?: string | undefined;
  todayLabel?: string | undefined;
  weekLabel?: string | undefined;
}

export interface NuiCalendarLabels {
  readonly previous: string;
  readonly next: string;
  readonly month: string;
  readonly year: string;
  readonly week: string;
}

export const NuiCalendarMode = { Single: 'single', Multiple: 'multiple', Range: 'range' } as const;

export const NuiCalendarView = { Days: 'days', Months: 'months', Years: 'years' } as const;

export const CalendarSlide = { Next: 'next', Prev: 'prev' } as const;

export const FocusRequest = { None: 'none', Follow: 'follow', Take: 'take' } as const;
