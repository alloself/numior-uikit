import type { IconSource } from '@numior/primitives';
import type { NuiRouteLocation } from '../shared/destination';
import type { Component } from 'vue';
import type { NuiSize, NuiTone } from '../shared/scale.types';

export type NuiButtonVariant = 'solid' | 'soft' | 'outline' | 'ghost' | 'plain' | 'link';

export type NuiButtonSize = 'inline' | 'xs' | NuiSize;

export interface NuiButtonProps {
  variant?: NuiButtonVariant | undefined;
  tone?: NuiTone | undefined;
  size?: NuiButtonSize | undefined;
  type?: 'button' | 'submit' | 'reset' | undefined;
  disabled?: boolean | undefined;
  loading?: boolean | undefined;
  iconOnly?: boolean | undefined;
  round?: boolean | undefined;
  icon?: IconSource | undefined;
  iconEnd?: IconSource | undefined;
  as?: string | Component | undefined;
  href?: string | undefined;
  to?: NuiRouteLocation | undefined;
}
