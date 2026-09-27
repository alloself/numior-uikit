import type { NuiSize } from './scale.types';

export interface NuiFieldControlProps {
  id?: string | undefined;
  size?: NuiSize | undefined;
  disabled?: boolean | undefined;
  required?: boolean | undefined;
  invalid?: boolean | undefined;
  label?: string | undefined;
  description?: string | undefined;
  error?: string | undefined;
  reserveError?: boolean | undefined;
}
