import type { FloatingPlacement, HourCycle, TimeSegmentType } from '@numior/primitives';
import type { NuiFieldControlProps } from '../shared/types';

export interface NuiTimeFieldProps extends NuiFieldControlProps {
  seconds?: boolean | undefined;
  hourCycle?: HourCycle | undefined;
  locale?: string | undefined;
  min?: string | undefined;
  max?: string | undefined;
  step?: number | undefined;
  readonly?: boolean | undefined;
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
  disabled: boolean;
  readonly: boolean;
  invalid: boolean;
  required: boolean;
}
