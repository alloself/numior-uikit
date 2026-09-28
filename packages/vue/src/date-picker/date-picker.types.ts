import type { FloatingPlacement, Weekday } from '@numior/primitives';
import type { NuiDatePreset } from '../calendar/calendar.types';
import type { NuiFieldControlProps } from '../shared/field-control.types';

export interface NuiDatePickerBaseProps extends NuiFieldControlProps {
  locale?: string | undefined;
  weekStart?: Weekday | undefined;
  min?: string | undefined;
  max?: string | undefined;
  isDateDisabled?: ((date: string) => boolean) | undefined;
  weekNumbers?: boolean | undefined;
  months?: number | undefined;
  today?: string | undefined;
  clearable?: boolean | undefined;
  readonly?: boolean | undefined;
  placement?: FloatingPlacement | undefined;
  openLabel?: string | undefined;
  clearLabel?: string | undefined;
  dialogLabel?: string | undefined;
  todayLabel?: string | undefined;
  previousLabel?: string | undefined;
  nextLabel?: string | undefined;
  monthLabel?: string | undefined;
  yearLabel?: string | undefined;
  weekLabel?: string | undefined;
}

export interface NuiDatePickerProps extends NuiDatePickerBaseProps {
  placeholder?: string | undefined;
  name?: string | undefined;
  time?: boolean | undefined;
  timeStep?: number | undefined;
  timeLabel?: string | undefined;
}

export interface NuiDateRangePickerProps extends NuiDatePickerBaseProps {
  startPlaceholder?: string | undefined;
  endPlaceholder?: string | undefined;
  startName?: string | undefined;
  endName?: string | undefined;
  endLabel?: string | undefined;
  presets?: readonly NuiDatePreset[] | undefined;
}

export interface NuiDateInputProps {
  modelValue: string | null;
  locale: string;
  min?: string | undefined;
  max?: string | undefined;
  isDateDisabled?: ((date: string) => boolean) | undefined;
  time?: boolean | undefined;
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
  readonly?: boolean | undefined;
  label?: string | undefined;
}
