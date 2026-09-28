import type { FloatingPlacement, HourCycle, TimeSegmentType } from '@numior/primitives';
import type { NuiFieldControlProps } from '../shared/field-control.types';
import type { WheelColumn, WheelOption } from './time-wheels';

export interface NuiTimeFieldProps extends NuiFieldControlProps {
  seconds?: boolean | undefined;
  hourCycle?: HourCycle | undefined;
  locale?: string | undefined;
  min?: string | undefined;
  max?: string | undefined;
  step?: number | undefined;
  name?: string | undefined;
  placement?: FloatingPlacement | undefined;
  clockLabel?: string | undefined;
  emptyLabel?: string | undefined;
}

export interface NuiTimeSegmentProps {
  type: TimeSegmentType;
  text: string;
  label: string;
  value: number | null;
  min: number;
  max: number;
  valueText?: string | undefined;
  id?: string | undefined;
  tabStop: boolean;
  last?: boolean | undefined;
  disabled: boolean;
  readonly: boolean;
  invalid: boolean;
  required: boolean;
}

export interface NuiTimeWheelProps {
  options: readonly WheelOption[];
  selected: number;
  label: string;
  tabStop: boolean;
}

export interface NuiTimeWheelsProps {
  columns: readonly WheelColumn[];
  labels: Readonly<Record<TimeSegmentType, string>>;
  emptyText: string;
}
