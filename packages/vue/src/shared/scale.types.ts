export type NuiSize = (typeof NuiSize)[keyof typeof NuiSize];

export type NuiTone = (typeof NuiTone)[keyof typeof NuiTone];

export const NuiSize = { Sm: 'sm', Md: 'md', Lg: 'lg' } as const;

export const NuiTone = {
  Primary: 'primary',
  Secondary: 'secondary',
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
  Info: 'info',
  Neutral: 'neutral',
} as const;
