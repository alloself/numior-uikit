import type { Toast } from '@numior/primitives';

export type NuiToasterPlacement = (typeof NuiToasterPlacement)[keyof typeof NuiToasterPlacement];

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

export const NuiToasterPlacement = {
  TopStart: 'top-start',
  Top: 'top',
  TopEnd: 'top-end',
  BottomStart: 'bottom-start',
  Bottom: 'bottom',
  BottomEnd: 'bottom-end',
} as const;
