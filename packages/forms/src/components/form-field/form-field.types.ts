import type { ValidateOn } from '../../core/form.types';
import type { FormContext } from '../../form/form-context';
import type { KeepValue } from '../../paths/paths.types';
import type { FieldSelector } from '../../paths/selector';
import type { AnyFieldRule } from '../../rules/async-rule';

export interface FieldScopeBinding<R> {
  readonly name: string;
  readonly modelValue: R;
  readonly 'onUpdate:modelValue': (value: R) => void;
}

export interface NuiFormFieldProps<T extends object, R> {
  form: FormContext<T>;
  name: FieldSelector<T, R>;
  id?: string | undefined;
  label?: string | undefined;
  description?: string | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  group?: boolean | undefined;
  reserveError?: boolean | undefined;
  keepValue?: KeepValue<R> | undefined;
  rules?: readonly AnyFieldRule<R, T>[] | undefined;
  validateOn?: ValidateOn | undefined;
  debounce?: number | undefined;
}
