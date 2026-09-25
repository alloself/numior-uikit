import type { DateRange, Weekday } from '@numior/primitives';
import type { NuiSize } from '../shared/types';

export type NuiCalendarMode = 'single' | 'multiple' | 'range';

export type NuiCalendarView = 'days' | 'months' | 'years';

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
