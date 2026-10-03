import type { NuiDialogProps } from '../dialog/dialog.types';

export type NuiDrawerSide = 'start' | 'end' | 'top' | 'bottom';
export type NuiDrawerSize = 'sm' | 'md' | 'lg' | 'xl';

export interface NuiDrawerProps extends Omit<NuiDialogProps, 'size'> {
  side?: NuiDrawerSide | undefined;
  size?: NuiDrawerSize | undefined;
}
