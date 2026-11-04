import type { NuiDialogProps } from '../dialog/dialog.types';

export type NuiDrawerSide = (typeof NuiDrawerSide)[keyof typeof NuiDrawerSide];
export type NuiDrawerSize = (typeof NuiDrawerSize)[keyof typeof NuiDrawerSize];

export interface NuiDrawerProps extends Omit<NuiDialogProps, 'size' | 'placement' | 'bare'> {
  side?: NuiDrawerSide | undefined;
  size?: NuiDrawerSize | undefined;
}

export const NuiDrawerSide = { Start: 'start', End: 'end', Top: 'top', Bottom: 'bottom' } as const;

export const NuiDrawerSize = { Sm: 'sm', Md: 'md', Lg: 'lg', Xl: 'xl' } as const;
