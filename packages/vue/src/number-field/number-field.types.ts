import type { NuiFieldControlProps } from '../shared/field-control.types';

export interface NuiNumberFieldProps extends NuiFieldControlProps {
  min?: number | undefined;
  max?: number | undefined;
  step?: number | undefined;
  formatOptions?: Intl.NumberFormatOptions | undefined;
  locale?: string | undefined;
  steppers?: boolean | undefined;
  name?: string | undefined;
  incrementLabel?: string | undefined;
  decrementLabel?: string | undefined;
}
