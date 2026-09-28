import type { FloatingPlacement } from '@numior/primitives';
import type { NuiTriggerRef } from '../shared/trigger-ref';

export interface NuiTooltipProps {
  id?: string | undefined;
  placement?: FloatingPlacement | undefined;
  offset?: number | undefined;
  openDelay?: number | undefined;
  closeDelay?: number | undefined;
  disabled?: boolean | undefined;
  anchor?: HTMLElement | null | undefined;
}

export interface NuiTooltipTriggerAttrs {
  readonly 'aria-describedby': string | undefined;
  readonly ref: NuiTriggerRef;
  readonly onPointerenter: (event: PointerEvent) => void;
  readonly onPointerleave: () => void;
  readonly onPointerdown: () => void;
  readonly onFocus: () => void;
  readonly onBlur: () => void;
}

export interface NuiTooltipTriggerSlot {
  readonly attrs: NuiTooltipTriggerAttrs;
  readonly open: boolean;
}
