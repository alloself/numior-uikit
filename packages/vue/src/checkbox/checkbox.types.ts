import type { NuiFieldControlProps } from '../shared/types';

export interface NuiCheckboxProps<T = unknown> extends NuiFieldControlProps {
  indeterminate?: boolean | undefined;
  value?: T | undefined;
}
