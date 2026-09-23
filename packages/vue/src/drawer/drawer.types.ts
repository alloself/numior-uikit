import type { NuiDialogProps } from '../dialog/dialog.types';

export type NuiDrawerSide = 'start' | 'end' | 'top' | 'bottom';

export interface NuiDrawerProps extends NuiDialogProps {
  side?: NuiDrawerSide | undefined;
}
