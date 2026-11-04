import type { IconSource } from '@numior/primitives';

export type NuiAvatarSize = (typeof NuiAvatarSize)[keyof typeof NuiAvatarSize];
export type NuiAvatarShape = (typeof NuiAvatarShape)[keyof typeof NuiAvatarShape];
export type NuiAvatarStatus = (typeof NuiAvatarStatus)[keyof typeof NuiAvatarStatus];

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

export const NuiAvatarSize = { Sm: 'sm', Md: 'md', Lg: 'lg', Xl: 'xl' } as const;

export const NuiAvatarShape = { Circle: 'circle', Square: 'square' } as const;

export const NuiAvatarStatus = {
  Online: 'online',
  Offline: 'offline',
  Busy: 'busy',
  Away: 'away',
} as const;
