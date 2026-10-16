import type { FloatingPlacement, PopoverInvokerAttrs, PopoverMode } from '@numior/primitives';
import type { NuiTriggerRef } from '../shared/trigger-ref';

export interface NuiPopoverProps {
  id?: string | undefined;
  placement?: FloatingPlacement | undefined;
  offset?: number | undefined;
  arrow?: boolean | undefined;
  padding?: NuiPopoverPadding | undefined;
  anchor?: HTMLElement | null | undefined;
  mode?: PopoverMode | undefined;
}

export type NuiPopoverPadding = 'sm' | 'md';

export interface NuiPopoverTriggerAttrs extends PopoverInvokerAttrs {
  readonly ref: NuiTriggerRef;
}

export interface NuiPopoverTriggerSlot {
  readonly attrs: NuiPopoverTriggerAttrs;
  readonly open: boolean;
}
