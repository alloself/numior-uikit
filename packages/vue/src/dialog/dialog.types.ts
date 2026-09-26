import type { NuiSize } from '../shared/scale.types';

export interface NuiDialogProps {
  id?: string | undefined;
  title?: string | undefined;
  description?: string | undefined;
  size?: NuiSize | undefined;
  closable?: boolean | undefined;
  closeOnBackdrop?: boolean | undefined;
  closeLabel?: string | undefined;
}
