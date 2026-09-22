import type { NuiSize, NuiTone } from '../shared/types';

/** Shape of the button; the color comes from `tone`. */
export type NuiButtonVariant = 'solid' | 'soft' | 'outline' | 'ghost' | 'link';

export interface NuiButtonProps {
  variant?: NuiButtonVariant;
  tone?: NuiTone;
  size?: NuiSize;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
}
