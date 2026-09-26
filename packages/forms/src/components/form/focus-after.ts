import type { SubmitResult } from '../../core/types';

export type FormFocus =
  | { readonly kind: 'field'; readonly path: string }
  | { readonly kind: 'errors' };

export const focusAfter = ({ invalid, formErrors }: SubmitResult): FormFocus | undefined => {
  const [path] = invalid;

  if (path !== undefined) {
    return { kind: 'field', path };
  }
  return formErrors.length > 0 ? { kind: 'errors' } : undefined;
};
