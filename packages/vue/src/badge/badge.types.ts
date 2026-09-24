import type { IconAlias } from '@numior/primitives';
import type { NuiTone } from '../shared/types';

export type NuiBadgeVariant = 'soft' | 'outline' | 'solid';
export type NuiBadgeSize = 'sm' | 'md';

export interface NuiBadgeProps {
  tone?: NuiTone | undefined;
  variant?: NuiBadgeVariant | undefined;
  size?: NuiBadgeSize | undefined;
  icon?: IconAlias | undefined;
  dot?: boolean | undefined;
  count?: number | undefined;
  max?: number | undefined;
  label?: string | undefined;
  floating?: boolean | undefined;
}
