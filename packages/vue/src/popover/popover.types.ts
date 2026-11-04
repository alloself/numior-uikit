import type { FloatingPlacement, PopoverInvokerAttrs, PopoverMode } from '@numior/primitives';
import type { NuiTriggerRef } from '../shared/trigger-ref';

export interface NuiPopoverProps {
  id?: string | undefined;
  placement?: FloatingPlacement | undefined;
  offset?: number | undefined;
  arrow?: boolean | undefined;
  padding?: NuiPopoverPadding | undefined;
  size?: NuiPopoverSize | undefined;
  anchor?: HTMLElement | null | undefined;
  mode?: PopoverMode | undefined;
  trigger?: NuiPopoverTrigger | undefined;
  openDelay?: number | undefined;
  closeDelay?: number | undefined;
}

export type NuiPopoverPadding = (typeof NuiPopoverPadding)[keyof typeof NuiPopoverPadding];

export type NuiPopoverSize = (typeof NuiPopoverSize)[keyof typeof NuiPopoverSize];

export type NuiPopoverTrigger = (typeof NuiPopoverTrigger)[keyof typeof NuiPopoverTrigger];

export interface NuiPopoverHoverAttrs {
  readonly onPointerenter?: (event: PointerEvent) => void;
  readonly onPointerleave?: (event: PointerEvent) => void;
  readonly onPointerdown?: (event: PointerEvent) => void;
  readonly onFocus?: () => void;
  readonly onFocusout?: (event: FocusEvent) => void;
}

export interface NuiPopoverTriggerAttrs
  extends Omit<PopoverInvokerAttrs, 'popovertarget'>, NuiPopoverHoverAttrs {
  readonly popovertarget?: string;
  readonly ref: NuiTriggerRef;
}

export interface NuiPopoverTriggerSlot {
  readonly attrs: NuiPopoverTriggerAttrs;
  readonly open: boolean;
}

export const NuiPopoverPadding = { None: 'none', Sm: 'sm', Md: 'md' } as const;

export const NuiPopoverSize = { Md: 'md', Auto: 'auto' } as const;

export const NuiPopoverTrigger = { Click: 'click', Hover: 'hover' } as const;
