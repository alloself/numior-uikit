import type { FormPath, FormPathValue, ValidateOn } from '../../core/types';
import type { FormContext } from '../../form/form-context';
import type { AnyFieldRule } from '../../rules/async-rule';

export type NuiFormFieldValue<T extends object, P extends string> =
  string extends FormPath<T> ? never : FormPathValue<T, P>;

export interface NuiFormFieldProps<T extends object, P extends FormPath<T>> {
  name: P;
  form?: FormContext<T> | undefined;
  id?: string | undefined;
  label?: string | undefined;
  description?: string | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  group?: boolean | undefined;
  keepValue?: boolean | undefined;
  rules?: readonly AnyFieldRule<FormPathValue<T, P>>[] | undefined;
  validateOn?: ValidateOn | undefined;
  debounce?: number | undefined;
}
