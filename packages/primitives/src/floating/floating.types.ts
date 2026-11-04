import type { Placement, Side, Strategy } from '@floating-ui/dom';

export type FloatingSide = Side;

export type FloatingPlacement = Placement;

export type FloatingStrategy = Strategy;

export const FloatingSide = {
  Top: 'top',
  Bottom: 'bottom',
  Left: 'left',
  Right: 'right',
} as const satisfies Record<string, Side>;

export const FloatingStrategy = {
  Fixed: 'fixed',
  Absolute: 'absolute',
} as const satisfies Record<string, Strategy>;

export const FloatingPlacement = {
  Top: 'top',
  TopStart: 'top-start',
  TopEnd: 'top-end',
  Bottom: 'bottom',
  BottomStart: 'bottom-start',
  BottomEnd: 'bottom-end',
  Left: 'left',
  LeftStart: 'left-start',
  LeftEnd: 'left-end',
  Right: 'right',
  RightStart: 'right-start',
  RightEnd: 'right-end',
} as const satisfies Record<string, Placement>;
