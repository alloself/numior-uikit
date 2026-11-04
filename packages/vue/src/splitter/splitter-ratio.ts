import { clamp } from '@vueuse/core';
import { Key } from '@numior/primitives';
import { SplitterStep } from './splitter.types';

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
): SplitterStep | undefined => {
  switch (key) {
    case Key.Home:
      return SplitterStep.Min;
    case Key.End:
      return SplitterStep.Max;
    case Key.ArrowUp:
      return vertical ? SplitterStep.Shrink : undefined;
    case Key.ArrowDown:
      return vertical ? SplitterStep.Grow : undefined;
    case Key.ArrowLeft:
      return vertical ? undefined : rtl ? SplitterStep.Grow : SplitterStep.Shrink;
    case Key.ArrowRight:
      return vertical ? undefined : rtl ? SplitterStep.Shrink : SplitterStep.Grow;
    default:
      return undefined;
  }
};
