import type { ValidateOn } from '../../core/types';
import type { FormContext } from '../../form/form-context';
import type { FieldSelector } from '../../paths/selector';
import type { AnyFieldRule } from '../../rules/async-rule';

export interface NuiFormFieldProps<T extends object, R> {
  form: FormContext<T>;
  name: FieldSelector<T, R>;
  id?: string | undefined;
  label?: string | undefined;
  description?: string | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  group?: boolean | undefined;
  keepValue?: boolean | undefined;
  rules?: readonly AnyFieldRule<R, T>[] | undefined;
  validateOn?: ValidateOn | undefined;
  debounce?: number | undefined;
}
