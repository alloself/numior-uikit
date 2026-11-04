import type { IconSource } from '@numior/primitives';
import type { NuiTone } from '../shared/scale.types';

export type NuiAlertVariant = (typeof NuiAlertVariant)[keyof typeof NuiAlertVariant];

export interface NuiAlertProps {
  variant?: NuiAlertVariant | undefined;
  tone?: NuiTone | undefined;
  title?: string | undefined;
  description?: string | undefined;
  icon?: IconSource | undefined;
  hideIcon?: boolean | undefined;
  dismissible?: boolean | undefined;
  dismissLabel?: string | undefined;
}

export const NuiAlertVariant = { Soft: 'soft', Outline: 'outline', Solid: 'solid' } as const;
