import type { IconAlias, ToastTone } from '@numior/primitives';
import { NuiTone } from './scale.types';

export const toneIcon = (tone: ToastTone | NuiTone): IconAlias | undefined =>
  tone === NuiTone.Info ||
  tone === NuiTone.Success ||
  tone === NuiTone.Warning ||
  tone === NuiTone.Error
    ? tone
    : undefined;
