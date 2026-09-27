import { clamp } from '@vueuse/core';

export interface RatioBounds {
  readonly min: number;
  readonly max: number;
}

export const clampRatio = (value: number, bounds: RatioBounds): number =>
  clamp(value, bounds.min, bounds.max);

export const ratioFromPointer = (
  rect: DOMRect,
  point: { readonly clientX: number; readonly clientY: number },
  vertical: boolean,
  rtl: boolean,
): number => {
  if (vertical) {
    return rect.height === 0 ? 0 : (point.clientY - rect.top) / rect.height;
  }
  if (rect.width === 0) {
    return 0;
  }
  const fromStart = rtl ? rect.right - point.clientX : point.clientX - rect.left;

  return fromStart / rect.width;
};

export const ratioMoveFor = (
  key: string,
  vertical: boolean,
  rtl: boolean,
): 'grow' | 'shrink' | 'min' | 'max' | undefined => {
  switch (key) {
    case 'Home':
      return 'min';
    case 'End':
      return 'max';
    case 'ArrowUp':
      return vertical ? 'shrink' : undefined;
    case 'ArrowDown':
      return vertical ? 'grow' : undefined;
    case 'ArrowLeft':
      return vertical ? undefined : rtl ? 'grow' : 'shrink';
    case 'ArrowRight':
      return vertical ? undefined : rtl ? 'shrink' : 'grow';
    default:
      return undefined;
  }
};
