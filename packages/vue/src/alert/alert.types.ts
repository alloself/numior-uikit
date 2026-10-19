import type { IconSource } from '@numior/primitives';
import type { NuiTone } from '../shared/scale.types';

export type NuiAlertVariant = 'soft' | 'outline' | 'solid';

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
