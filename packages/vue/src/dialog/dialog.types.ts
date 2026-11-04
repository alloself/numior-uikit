import { NuiSize } from '../shared/scale.types';

export type NuiDialogPlacement = (typeof NuiDialogPlacement)[keyof typeof NuiDialogPlacement];

export type NuiDialogSize = (typeof NuiDialogSize)[keyof typeof NuiDialogSize];

export interface NuiDialogProps {
  id?: string | undefined;
  placement?: NuiDialogPlacement | undefined;
  bare?: boolean | undefined;
  title?: string | undefined;
  description?: string | undefined;
  size?: NuiDialogSize | undefined;
  closable?: boolean | undefined;
  closeOnBackdrop?: boolean | undefined;
  closeLabel?: string | undefined;
}

export const NuiDialogPlacement = { Center: 'center', Top: 'top' } as const;

export const NuiDialogSize = { ...NuiSize, Auto: 'auto' } as const;
