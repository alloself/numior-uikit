import type { NuiFieldControlProps } from '../shared/types';

export type NuiRadioGroupOrientation = 'vertical' | 'horizontal';

export interface NuiRadioGroupProps extends NuiFieldControlProps {
  name?: string | undefined;
  orientation?: NuiRadioGroupOrientation | undefined;
}

export interface NuiRadioProps<T = unknown> {
  value: T;
  id?: string | undefined;
  disabled?: boolean | undefined;
}
