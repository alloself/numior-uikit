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

export const useEdgeScroll = (options: EdgeScrollOptions): EdgeScroll => {
  let dx = 0;
  let dy = 0;

  const step = (frames: number): void => {
    const container = toValue(options.container);

    if (!container || (dx === 0 && dy === 0)) {
      loop.pause();
      return;
    }
    container.scrollLeft += Math.round(dx * frames);
    container.scrollTop += Math.round(dy * frames);
    options.onStep();
  };

  const loop = useRafFn(
    ({ delta }) => {
      step(Math.min(delta / FRAME, MOST_FRAMES));
    },
    { immediate: false },
  );

  const stop = (): void => {
    dx = 0;
    dy = 0;
    loop.pause();
  };

  return {
    follow: (point) => {
      const container = toValue(options.container);

      if (!container) {
        stop();
        return;
      }
      const rect = container.getBoundingClientRect();

      dx = deltaOf(point.x, rect.left, rect.right);
      dy = deltaOf(point.y, rect.top, rect.bottom);
      step(1);

      if (dx !== 0 || dy !== 0) {
        loop.resume();
      }
    },
    stop,
  };
};
