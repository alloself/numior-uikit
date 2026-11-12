import { onBeforeUpdate, onUpdated, type MaybeRefOrGetter, toValue } from 'vue';

interface MotionTiming {
  readonly duration: number;
  readonly easing: string;
}

const toMilliseconds = (value: string): number => {
  const amount = Number.parseFloat(value);

  if (!Number.isFinite(amount)) {
    return 0;
  }
  return value.trim().endsWith('ms') ? amount : amount * 1000;
};

const motionTiming = (element: Element): MotionTiming => {
  const style = getComputedStyle(element);

  return {
    duration: toMilliseconds(style.getPropertyValue('--nui-duration-normal')),
    easing: style.getPropertyValue('--nui-easing').trim() || 'ease',
  };
};

const BLOCK_END_CLIP = 'inset(-100vmax -100vmax 0)';

const heightOf = (element: HTMLElement | null | undefined): number =>
  element?.getBoundingClientRect().height ?? 0;

export const useBlockSizeTween = (
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
): void => {
  const state = { before: 0 };

  onBeforeUpdate(() => {
    state.before = heightOf(toValue(target));
  });

  onUpdated(() => {
    const element = toValue(target);
    const after = heightOf(element);

    if (!element || typeof element.animate !== 'function' || Math.abs(after - state.before) < 1) {
      return;
    }

    const { duration, easing } = motionTiming(element);

    if (duration <= 0) {
      return;
    }

    element.animate(
      [
        { blockSize: `${state.before}px`, clipPath: BLOCK_END_CLIP },
        { blockSize: `${after}px`, clipPath: BLOCK_END_CLIP },
      ],
      { duration, easing },
    );
  });
};
