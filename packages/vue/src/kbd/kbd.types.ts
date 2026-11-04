export type NuiKbdSize = (typeof NuiKbdSize)[keyof typeof NuiKbdSize];

export type NuiKbdVariant = (typeof NuiKbdVariant)[keyof typeof NuiKbdVariant];

export type NuiKbdPlatform = (typeof NuiKbdPlatform)[keyof typeof NuiKbdPlatform];

export interface NuiKbdProps {
  keys?: string | readonly string[] | undefined;
  size?: NuiKbdSize | undefined;
  variant?: NuiKbdVariant | undefined;
  platform?: NuiKbdPlatform | undefined;
}

export const NuiKbdSize = { Sm: 'sm', Md: 'md' } as const;

export const NuiKbdVariant = { Boxed: 'boxed', Plain: 'plain' } as const;

export const NuiKbdPlatform = { Mac: 'mac', Other: 'other' } as const;
