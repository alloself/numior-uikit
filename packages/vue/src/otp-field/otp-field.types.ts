import type { OtpCharset } from '@numior/primitives';
import type { NuiFieldControlProps } from '../shared/field-control.types';

export interface NuiOtpFieldProps extends NuiFieldControlProps {
  length?: number | undefined;
  groupSize?: number | undefined;
  charset?: OtpCharset | undefined;
  secret?: boolean | undefined;
  placeholder?: string | undefined;
  webOtp?: boolean | undefined;
}

export interface NuiOtpSlotProps {
  char: string | undefined;
  active: boolean;
  revealed: boolean;
  caret: boolean;
  secret: boolean;
  placeholder: string | undefined;
}
