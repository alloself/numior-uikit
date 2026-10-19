import type { IconSource } from '@numior/primitives';
import type { NuiTone } from '../shared/scale.types';

export type NuiChipVariant = 'soft' | 'outline' | 'solid';
export type NuiChipSize = 'sm' | 'md';

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
