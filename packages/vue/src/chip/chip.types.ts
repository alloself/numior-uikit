import type { IconAlias } from '@numior/primitives';
import type { NuiTone } from '../shared/scale.types';

export type NuiChipVariant = 'soft' | 'outline' | 'solid';
export type NuiChipSize = 'sm' | 'md';

export interface NuiChipProps {
  tone?: NuiTone | undefined;
  variant?: NuiChipVariant | undefined;
  size?: NuiChipSize | undefined;
  icon?: IconAlias | undefined;
  removable?: boolean | undefined;
  removeLabel?: string | undefined;
  disabled?: boolean | undefined;
}
