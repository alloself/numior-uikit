import type { FloatingPlacement } from '@numior/primitives';
import type { NuiOption, NuiOptionKey, NuiOptionSource } from '../shared/options';
import type { NuiFieldControlProps } from '../shared/field-control.types';

export interface NuiSelectProps<T> extends NuiFieldControlProps {
  options: NuiOptionSource<T>;
  multiple?: boolean | undefined;
  clearable?: boolean | undefined;
  placeholder?: string | undefined;
  name?: string | undefined;
  getKey?: NuiOptionKey<T> | undefined;
  loop?: boolean | undefined;
  placement?: FloatingPlacement | undefined;
  emptyLabel?: string | undefined;
  clearLabel?: string | undefined;
  countLabel?: ((count: number) => string) | undefined;
}

export interface NuiSelectValueSlot<T> {
  readonly selected: readonly NuiOption<T>[];
}
