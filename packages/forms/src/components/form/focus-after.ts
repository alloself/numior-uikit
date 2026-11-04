import type { SubmitResult } from '../../core/form.types';
import { FormFocusKind } from './form.types';

export type FormFocus =
  | { readonly kind: typeof FormFocusKind.Field; readonly path: string }
  | { readonly kind: typeof FormFocusKind.Errors };

export const focusAfter = ({ invalid, formErrors }: SubmitResult): FormFocus | undefined => {
  const [path] = invalid;

  if (path !== undefined) {
    return { kind: FormFocusKind.Field, path };
  }
  return formErrors.length > 0 ? { kind: FormFocusKind.Errors } : undefined;
};
