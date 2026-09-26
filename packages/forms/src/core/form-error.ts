export type FormErrorMessages = Readonly<Record<string, string | readonly string[]>>;

export class NuiFormError extends Error {
  readonly errors: FormErrorMessages;

  constructor(errors: FormErrorMessages, message?: string) {
    super(message ?? '');
    this.name = 'NuiFormError';
    this.errors = errors;
  }
}
