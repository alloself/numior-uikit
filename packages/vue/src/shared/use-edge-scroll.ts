import { useEventListener, useMediaQuery } from '@vueuse/core';
import type { ShallowRef } from 'vue';
import type { DirectionControl } from '@numior/primitives';

export interface EdgeScrollOptions {
  readonly block: string;
  readonly root: Readonly<ShallowRef<HTMLElement | null>>;
  readonly track: Readonly<ShallowRef<HTMLElement | null>>;
  readonly startEdge: Readonly<ShallowRef<HTMLElement | null>>;
  readonly endEdge: Readonly<ShallowRef<HTMLElement | null>>;
  readonly direction: DirectionControl;
  readonly enabled: () => boolean;
}

export interface EdgeScroll {
  markOverflow(): void;
  page(steps: number): void;
  follow(target: () => HTMLElement | undefined, behavior: ScrollBehavior): void;
  keepFollowed(): void;
  glide(): ScrollBehavior;
}

interface EdgeOverflow {
  readonly start: boolean;
  readonly end: boolean;
}

const EDGE_SLACK = 1;
const PAGE_SHARE = 0.8;
const WHEEL_LINE = 16;
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const FITS: EdgeOverflow = { start: false, end: false };

const overflowOf = (track: HTMLElement): EdgeOverflow => {
  const start = Math.abs(track.scrollLeft);

  return {
    start: start > EDGE_SLACK,
    end: track.scrollWidth - track.clientWidth - start > EDGE_SLACK,
  };
};

const fits = (track: HTMLElement): boolean => track.scrollWidth - track.clientWidth <= EDGE_SLACK;

const hiddenPart = (track: HTMLElement, element: HTMLElement): number => {
  const frame = track.getBoundingClientRect();
  const box = element.getBoundingClientRect();
  const margin = Number.parseFloat(getComputedStyle(track).scrollPaddingInlineStart) || 0;

  if (box.left < frame.left) {
    return box.left - frame.left - margin;
  }
  return box.right > frame.right ? box.right - frame.right + margin : 0;
};

const wheelPixels = (event: WheelEvent): number =>
  event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * WHEEL_LINE : event.deltaY;

export const useEdgeScroll = (options: EdgeScrollOptions): EdgeScroll => {
  const { block, root, track, startEdge, endEdge, direction, enabled } = options;
  const reducedMotion = useMediaQuery(REDUCED_MOTION);
  let followed: (() => HTMLElement | undefined) | undefined;

  const release = (): void => {
    followed = undefined;
  };

  const markOverflow = (): void => {
    const element = track.value;

    if (!element) {
      return;
    }
    const hidden = enabled() ? overflowOf(element) : FITS;

    element.classList.toggle(`${block}__track--clipped-start`, hidden.start);
    element.classList.toggle(`${block}__track--clipped-end`, hidden.end);
    startEdge.value?.classList.toggle(`${block}__edge--shown`, hidden.start);
    endEdge.value?.classList.toggle(`${block}__edge--shown`, hidden.end);
  };

  const glide = (): ScrollBehavior => (reducedMotion.value ? 'instant' : 'smooth');

  const scrollTrack = (left: number, behavior: ScrollBehavior): void => {
    track.value?.scrollBy({ left, behavior });
  };

  const page = (steps: number): void => {
    const element = track.value;

    release();

    if (!element) {
      return;
    }

    const sign = direction.isRtl() ? -steps : steps;

    scrollTrack(sign * element.clientWidth * PAGE_SHARE, glide());
  };

  const reveal = (target: HTMLElement | undefined, behavior: ScrollBehavior): void => {
    const element = track.value;

    if (!element || !target || !enabled() || fits(element)) {
      return;
    }
    const hidden = hiddenPart(element, target);

    if (hidden === 0) {
      return;
    }

    scrollTrack(hidden, behavior);
  };

  const onWheel = (event: WheelEvent): void => {
    const element = track.value;

    const skipped = !enabled() || event.shiftKey || event.ctrlKey || event.deltaX !== 0;

    if (!element || skipped || fits(element)) {
      return;
    }
    const before = element.scrollLeft;

    scrollTrack(direction.isRtl() ? -wheelPixels(event) : wheelPixels(event), 'instant');

    if (element.scrollLeft === before) {
      return;
    }

    release();
    event.preventDefault();
  };

  const follow = (target: () => HTMLElement | undefined, behavior: ScrollBehavior): void => {
    followed = target;
    reveal(target(), behavior);
  };

  const keepFollowed = (): void => {
    if (followed === undefined) {
      return;
    }

    reveal(followed(), 'instant');
  };

  useEventListener(track, 'scroll', markOverflow, { passive: true });
  useEventListener(root, 'wheel', onWheel, { passive: false });
  useEventListener(root, ['pointerdown', 'focusin'], release, { passive: true });

  return { markOverflow, page, follow, keepFollowed, glide };
};
