import type { Toast } from '@numior/primitives';

export type NuiToasterPlacement =
  | 'top-start'
  | 'top'
  | 'top-end'
  | 'bottom-start'
  | 'bottom'
  | 'bottom-end';

export interface NuiToasterProps {
  id?: string | undefined;
  placement?: NuiToasterPlacement | undefined;
  expand?: boolean | undefined;
  label?: string | undefined;
  closeLabel?: string | undefined;
}

export interface NuiToasterSlot {
  readonly toast: Toast;
  dismiss(): void;
}

export interface NuiToastProps {
  toast: Toast;
  closeLabel?: string | undefined;
}
