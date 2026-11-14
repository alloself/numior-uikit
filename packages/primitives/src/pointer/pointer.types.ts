import type { ComponentPublicInstance } from 'vue';

export type PointerHandler = (event: PointerEvent) => void;

export interface PointerSessionHandlers {
  readonly down?: PointerHandler;
  readonly move?: PointerHandler;
  readonly up?: PointerHandler;
  readonly cancel?: PointerHandler;
}

export interface PointerSessionOptions {
  readonly capture?: boolean;
}

export interface PointerSession {
  readonly begin: (handlers: PointerSessionHandlers) => void;
  readonly end: () => void;
}

export interface PressTargets {
  attach(element: Element, press: PointerHandler): void;
  onPointerdown(event: PointerEvent): void;
}

export type PressRef = (element: Element | ComponentPublicInstance | null) => void;

export const PointerType = { Mouse: 'mouse', Pen: 'pen', Touch: 'touch' } as const;
