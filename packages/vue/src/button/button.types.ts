import type { Component } from 'vue';
import type { NuiSize, NuiTone } from '../shared/scale.types';

export type NuiButtonVariant = 'solid' | 'soft' | 'outline' | 'ghost' | 'link';

export interface NuiButtonProps {
  variant?: NuiButtonVariant | undefined;
  tone?: NuiTone | undefined;
  size?: NuiSize | undefined;
  type?: 'button' | 'submit' | 'reset' | undefined;
  disabled?: boolean | undefined;
  loading?: boolean | undefined;
  iconOnly?: boolean | undefined;
  as?: string | Component | undefined;
  href?: string | undefined;
  to?: unknown;
}
