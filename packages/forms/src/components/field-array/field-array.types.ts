import type { ValidateOn } from '../../core/types';
import type { FormContext } from '../../form/form-context';
import type { AnyFieldRule } from '../../rules/async-rule';

export interface NuiFieldArrayProps<R> {
  name: string;
  form?: FormContext | undefined;
  label?: string | undefined;
  description?: string | undefined;
  min?: number | undefined;
  max?: number | undefined;
  newRow?: (() => R) | undefined;
  reorderable?: boolean | undefined;
  disabled?: boolean | undefined;
  rules?: readonly AnyFieldRule<readonly R[]>[] | undefined;
  validateOn?: ValidateOn | undefined;
  addLabel?: string | undefined;
  emptyLabel?: string | undefined;
  removeLabel?: ((index: number) => string) | undefined;
  moveLabel?: ((index: number) => string) | undefined;
}

export interface NuiFieldArrayRowProps {
  id: string;
  path: string;
  form: FormContext;
  dragging?: boolean | undefined;
  reorderable?: boolean | undefined;
  removable?: boolean | undefined;
  gripDisabled?: boolean | undefined;
  moveLabel: string;
  removeLabel: string;
}
