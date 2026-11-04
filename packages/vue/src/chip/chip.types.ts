import type { IconSource } from '@numior/primitives';
import type { NuiTone } from '../shared/scale.types';

export type NuiChipVariant = (typeof NuiChipVariant)[keyof typeof NuiChipVariant];
export type NuiChipSize = (typeof NuiChipSize)[keyof typeof NuiChipSize];

export interface NuiChipProps {
  tone?: NuiTone | undefined;
  variant?: NuiChipVariant | undefined;
  size?: NuiChipSize | undefined;
  icon?: IconSource | undefined;
  removable?: boolean | undefined;
  removeTabbable?: boolean | undefined;
  removeLabel?: string | undefined;
  disabled?: boolean | undefined;
}

export const NuiChipVariant = { Soft: 'soft', Outline: 'outline', Solid: 'solid' } as const;

export const NuiChipSize = { Sm: 'sm', Md: 'md' } as const;
