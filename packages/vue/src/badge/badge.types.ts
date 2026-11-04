import type { IconSource } from '@numior/primitives';
import type { NuiTone } from '../shared/scale.types';

export type NuiBadgeVariant = (typeof NuiBadgeVariant)[keyof typeof NuiBadgeVariant];
export type NuiBadgeSize = (typeof NuiBadgeSize)[keyof typeof NuiBadgeSize];

export interface NuiBadgeProps {
  tone?: NuiTone | undefined;
  variant?: NuiBadgeVariant | undefined;
  size?: NuiBadgeSize | undefined;
  icon?: IconSource | undefined;
  dot?: boolean | undefined;
  count?: number | undefined;
  max?: number | undefined;
  label?: string | undefined;
  floating?: boolean | undefined;
}

export const NuiBadgeVariant = { Soft: 'soft', Outline: 'outline', Solid: 'solid' } as const;

export const NuiBadgeSize = { Sm: 'sm', Md: 'md' } as const;
