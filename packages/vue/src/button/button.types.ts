import type { NuiSize, NuiTone } from '../shared/types';

/** Shape of the button; the color comes from `tone`. */
export type NuiButtonVariant = 'solid' | 'soft' | 'outline' | 'ghost' | 'link';

export interface NuiButtonProps {
  variant?: NuiButtonVariant | undefined;
  tone?: NuiTone | undefined;
  size?: NuiSize | undefined;
  type?: 'button' | 'submit' | 'reset' | undefined;
  disabled?: boolean | undefined;
  loading?: boolean | undefined;
}
