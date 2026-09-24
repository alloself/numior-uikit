import type { ReorderAxis } from '@numior/primitives';

export interface NuiTableGhost {
  readonly label: string;
  readonly offset: number;
  readonly size: number;
}

export interface DragGrab {
  readonly offset: number;
  readonly size: number;
}

export const NO_GRAB: DragGrab = { offset: 0, size: 0 };

export const grabOf = (event: PointerEvent, axis: ReorderAxis, selector: string): DragGrab => {
  const element = event.target instanceof Element ? event.target.closest(selector) : null;
  if (!(element instanceof HTMLElement)) {
    return NO_GRAB;
  }
  const rect = element.getBoundingClientRect();
  return axis === 'x'
    ? { offset: event.clientX - rect.left, size: rect.width }
    : { offset: event.clientY - rect.top, size: rect.height };
};

const contentSize = (scroller: HTMLElement, axis: ReorderAxis): number => {
  const rect = scroller.firstElementChild?.getBoundingClientRect();
  const size = axis === 'x' ? rect?.width : rect?.height;
  return size !== undefined && size > 0 ? size : Number.POSITIVE_INFINITY;
};

export const clampInside = (
  scroller: HTMLElement,
  axis: ReorderAxis,
  value: number,
  size: number,
): number => Math.min(Math.max(0, value), Math.max(0, contentSize(scroller, axis) - size));

export const ghostAt = (
  scroller: HTMLElement | null | undefined,
  axis: ReorderAxis,
  position: number,
  grab: DragGrab,
  label: string,
): NuiTableGhost | undefined => {
  if (!scroller) {
    return undefined;
  }
  const rect = scroller.getBoundingClientRect();
  const base = axis === 'x' ? rect.left - scroller.scrollLeft : rect.top - scroller.scrollTop;
  const offset = clampInside(scroller, axis, position - grab.offset - base, grab.size);
  return { label, offset, size: grab.size };
};

export const visibleStart = (scroller: HTMLElement, rtl: boolean): number =>
  rtl ? scroller.scrollWidth - scroller.clientWidth + scroller.scrollLeft : scroller.scrollLeft;
