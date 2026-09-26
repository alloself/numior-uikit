import type { SubmitResult } from '../../core/form.types';
import type { FormContext } from '../../form/form-context';

export interface NuiFormProps<T extends object> {
  form: FormContext<T>;
  disabled?: boolean | undefined;
  submitAction?: (() => Promise<SubmitResult>) | undefined;
  submitLabel?: string | undefined;
  errorTitle?: string | undefined;
}
