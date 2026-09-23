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
  label?: string | undefined;
  closeLabel?: string | undefined;
}

export interface NuiToasterSlot {
  readonly toasts: readonly Toast[];
  dismiss(id: string): void;
}

export interface NuiToastProps {
  toast: Toast;
  closeLabel?: string | undefined;
}
