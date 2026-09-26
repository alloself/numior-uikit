import type { IconAlias, ToastTone } from '@numior/primitives';
import type { NuiTone } from './scale.types';

export const toneIcon = (tone: ToastTone | NuiTone): IconAlias | undefined =>
  tone === 'info' || tone === 'success' || tone === 'warning' || tone === 'error'
    ? tone
    : undefined;
