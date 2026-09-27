import type { NuiSize } from '../shared/scale.types';

export type NuiDialogPlacement = 'center' | 'top';

export interface NuiDialogProps {
  id?: string | undefined;
  placement?: NuiDialogPlacement | undefined;
  bare?: boolean | undefined;
  title?: string | undefined;
  description?: string | undefined;
  size?: NuiSize | undefined;
  closable?: boolean | undefined;
  closeOnBackdrop?: boolean | undefined;
  closeLabel?: string | undefined;
}
