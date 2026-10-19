import type { IconSource } from '@numior/primitives';

export type NuiEmptySize = 'sm' | 'md';

export interface NuiEmptyProps {
  icon?: IconSource | undefined;
  hideIcon?: boolean | undefined;
  title?: string | undefined;
  description?: string | undefined;
  size?: NuiEmptySize | undefined;
}
