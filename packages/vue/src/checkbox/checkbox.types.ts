import type { NuiOption, NuiOptionKey } from '../shared/options';
import type { NuiFieldControlProps } from '../shared/field-control.types';

export type NuiCheckboxGroupOrientation = 'vertical' | 'horizontal';

export interface NuiCheckboxProps extends NuiFieldControlProps {
  indeterminate?: boolean | undefined;
  value?: string | undefined;
}

export interface NuiCheckboxGroupProps<T> extends NuiFieldControlProps {
  options: readonly NuiOption<T>[];
  name?: string | undefined;
  orientation?: NuiCheckboxGroupOrientation | undefined;
  getKey?: NuiOptionKey<T> | undefined;
}
