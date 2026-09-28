import type { ValidateOn } from '../../core/form.types';
import type { FormContext, FormHandle } from '../../form/form-context';
import type { FieldSelector } from '../../paths/selector';
import type { AnyFieldRule } from '../../rules/async-rule';

export interface NuiFieldArrayProps<T extends object, Row> {
  form: FormContext<T>;
  name: FieldSelector<T, readonly Row[] | undefined>;
  label?: string | undefined;
  description?: string | undefined;
  min?: number | undefined;
  max?: number | undefined;
  newRow?: (() => Row) | undefined;
  reorderable?: boolean | undefined;
  disabled?: boolean | undefined;
  readonly?: boolean | undefined;
  rules?: readonly AnyFieldRule<readonly Row[], T>[] | undefined;
  validateOn?: ValidateOn | undefined;
  addLabel?: string | undefined;
  emptyLabel?: string | undefined;
  removeLabel?: ((index: number) => string) | undefined;
  moveLabel?: ((index: number) => string) | undefined;
}

export interface NuiFieldArrayRowProps {
  id: string;
  path: string;
  form: FormHandle;
  dragging?: boolean | undefined;
  reorderable?: boolean | undefined;
  removable?: boolean | undefined;
  gripDisabled?: boolean | undefined;
  moveLabel: string;
  removeLabel: string;
}
