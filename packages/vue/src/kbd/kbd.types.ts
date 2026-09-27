export type NuiKbdSize = 'sm' | 'md';

export type NuiKbdVariant = 'boxed' | 'plain';

export type NuiKbdPlatform = 'mac' | 'other';

export interface NuiKbdProps {
  keys?: string | readonly string[] | undefined;
  size?: NuiKbdSize | undefined;
  variant?: NuiKbdVariant | undefined;
  platform?: NuiKbdPlatform | undefined;
}
