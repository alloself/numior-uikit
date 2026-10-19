import type { IconSource } from '@numior/primitives';

export type NuiAvatarSize = 'sm' | 'md' | 'lg' | 'xl';
export type NuiAvatarShape = 'circle' | 'square';
export type NuiAvatarStatus = 'online' | 'offline' | 'busy' | 'away';

export interface NuiAvatarProps {
  src?: string | undefined;
  alt?: string | undefined;
  name?: string | undefined;
  size?: NuiAvatarSize | undefined;
  shape?: NuiAvatarShape | undefined;
  status?: NuiAvatarStatus | undefined;
  statusLabel?: string | undefined;
  icon?: IconSource | undefined;
}

export interface NuiAvatarItem {
  readonly key?: string | undefined;
  readonly src?: string | undefined;
  readonly alt?: string | undefined;
  readonly name?: string | undefined;
}

export interface NuiAvatarGroupProps {
  items?: readonly NuiAvatarItem[] | undefined;
  max?: number | undefined;
  size?: NuiAvatarSize | undefined;
  shape?: NuiAvatarShape | undefined;
  label?: string | undefined;
  overflowLabel?: ((count: number) => string) | undefined;
}
