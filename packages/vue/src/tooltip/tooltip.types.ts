import type { FloatingPlacement } from '@numior/primitives';
import type { NuiTriggerRef } from '../shared/trigger-ref';

export type NuiTooltipKeys = string | readonly string[];

export type NuiTooltipShortcut =
  | NuiTooltipKeys
  | ((target: HTMLElement | null) => NuiTooltipKeys | undefined);

export interface NuiTooltipProps {
  id?: string | undefined;
  placement?: FloatingPlacement | undefined;
  offset?: number | undefined;
  openDelay?: number | undefined;
  closeDelay?: number | undefined;
  disabled?: boolean | undefined;
  anchor?: HTMLElement | NuiTooltipTargets | null | undefined;
  shortcut?: NuiTooltipShortcut | undefined;
}

export interface NuiTooltipTargets {
  readonly within?: HTMLElement | null | undefined;
  readonly selector: string;
  readonly when?: ((target: HTMLElement) => boolean) | undefined;
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

export interface NuiTooltipTargetsAttrs {
  readonly ref: NuiTriggerRef;
  readonly onPointerover: (event: PointerEvent) => void;
  readonly onPointerout: (event: PointerEvent) => void;
  readonly onPointerdown: () => void;
  readonly onFocusin: (event: FocusEvent) => void;
  readonly onFocusout: (event: FocusEvent) => void;
}

export interface NuiTooltipTriggerSlot {
  readonly attrs: NuiTooltipTriggerAttrs | NuiTooltipTargetsAttrs;
  readonly open: boolean;
}

export interface NuiTooltipContentSlot {
  readonly target: HTMLElement | null;
}
