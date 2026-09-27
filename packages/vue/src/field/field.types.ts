import type { FieldContext } from '@numior/primitives';

export interface NuiFieldProps {
  id?: string | undefined;
  label?: string | undefined;
  description?: string | undefined;
  error?: string | undefined;
  invalid?: boolean | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  group?: boolean | undefined;
  reserveError?: boolean | undefined;
}

export interface NuiFieldPartProps {
  field?: FieldContext | undefined;
}

export interface NuiFieldFrameProps {
  field: FieldContext;
  own: boolean;
  label?: string | undefined;
  description?: string | undefined;
  error?: string | undefined;
  reserveError?: boolean | undefined;
  group?: boolean | undefined;
  inline?: boolean | undefined;
}
