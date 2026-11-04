import type { SubmitResult } from '../../core/form.types';
import type { FormContext } from '../../form/form-context';

export type FormFocusKind = (typeof FormFocusKind)[keyof typeof FormFocusKind];

export interface NuiFormProps<T extends object> {
  form: FormContext<T>;
  disabled?: boolean | undefined;
  readonly?: boolean | undefined;
  reserveError?: boolean | undefined;
  submitAction?: (() => Promise<SubmitResult>) | undefined;
  submitLabel?: string | undefined;
  errorTitle?: string | undefined;
}

export const FormFocusKind = { Field: 'field', Errors: 'errors' } as const;
