import type { IconAlias } from '@numior/primitives';

export type NuiEmptySize = 'sm' | 'md';

export interface NuiEmptyProps {
  icon?: IconAlias | undefined;
  hideIcon?: boolean | undefined;
  title?: string | undefined;
  description?: string | undefined;
  size?: NuiEmptySize | undefined;
}
