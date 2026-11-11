import { useRafFn } from '@vueuse/core';
import { toValue, type MaybeRefOrGetter } from 'vue';

export interface EdgePoint {
  readonly x?: number | undefined;
  readonly y?: number | undefined;
}

export interface EdgeScrollOptions {
  readonly container: MaybeRefOrGetter<HTMLElement | null | undefined>;
  readonly onStep: () => void;
}

export interface EdgeScroll {
  follow(point: EdgePoint): void;
  stop(): void;
}

const EDGE = 24;
const STEP = 8;
const FRAME = 1000 / 60;
const MOST_FRAMES = 4;

const deltaOf = (client: number | undefined, start: number, end: number): number => {
  if (client === undefined) {
    return 0;
  }
  if (client < start + EDGE) {
    return -STEP;
  }
  return client > end - EDGE ? STEP : 0;
};

const framesOf = (delta: number): number => (delta > 0 ? Math.min(delta / FRAME, MOST_FRAMES) : 1);

export const useEdgeScroll = (options: EdgeScrollOptions): EdgeScroll => {
  let point: EdgePoint | undefined;
  let stepped = -1;

  const loop = useRafFn(
    ({ delta, timestamp }) => {
      if (timestamp === stepped) {
        return;
      }
      stepped = timestamp;

      const container = toValue(options.container);
      const rect = container?.getBoundingClientRect();
      const dx = rect ? deltaOf(point?.x, rect.left, rect.right) : 0;
      const dy = rect ? deltaOf(point?.y, rect.top, rect.bottom) : 0;

      if (!container || (dx === 0 && dy === 0)) {
        loop.pause();
        return;
      }

      const frames = framesOf(delta);
      const { scrollLeft, scrollTop } = container;

      container.scrollLeft += Math.round(dx * frames);
      container.scrollTop += Math.round(dy * frames);

      if (container.scrollLeft !== scrollLeft || container.scrollTop !== scrollTop) {
        options.onStep();
      }
    },
    { immediate: false },
  );

  return {
    follow: (next) => {
      point = next;
      loop.resume();
    },
    stop: () => {
      point = undefined;
      loop.pause();
    },
  };
};
