import type { NuiFieldControlProps } from '../shared/field-control.types';
import type { NuiOption, NuiOptionKey } from '../shared/options';

export type NuiRadioGroupOrientation =
  (typeof NuiRadioGroupOrientation)[keyof typeof NuiRadioGroupOrientation];

export interface NuiRadioGroupProps<T = unknown> extends NuiFieldControlProps {
  name?: string | undefined;
  orientation?: NuiRadioGroupOrientation | undefined;
  options?: readonly NuiOption<T>[] | undefined;
  getKey?: NuiOptionKey<NonNullable<T>> | undefined;
}

export interface NuiRadioProps<T = unknown> {
  value: T;
  id?: string | undefined;
  disabled?: boolean | undefined;
}

export const NuiRadioGroupOrientation = { Vertical: 'vertical', Horizontal: 'horizontal' } as const;
