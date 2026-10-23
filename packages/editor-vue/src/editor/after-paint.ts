import { promiseTimeout } from '@vueuse/core';

const IDLE_TIMEOUT = 200;

export const afterPaint = async (): Promise<void> => {
  if (typeof requestAnimationFrame === 'function') {
    await new Promise((resolve) => {
      requestAnimationFrame(resolve);
    });
  }
  await promiseTimeout(0);
};

export const afterIdle = async (): Promise<void> => {
  await afterPaint();
  if (typeof requestIdleCallback === 'function') {
    await new Promise((resolve) => {
      requestIdleCallback(resolve, { timeout: IDLE_TIMEOUT });
    });
  }
};
