import type { IconSource } from '@numior/primitives';

export type NuiEmptySize = (typeof NuiEmptySize)[keyof typeof NuiEmptySize];

export interface NuiEmptyProps {
  icon?: IconSource | undefined;
  hideIcon?: boolean | undefined;
  title?: string | undefined;
  description?: string | undefined;
  size?: NuiEmptySize | undefined;
}

export const NuiEmptySize = { Sm: 'sm', Md: 'md' } as const;
