import { promiseTimeout } from '@vueuse/core';

export const afterPaint = async (): Promise<void> => {
  if (typeof requestAnimationFrame === 'function') {
    await new Promise((resolve) => {
      requestAnimationFrame(resolve);
    });
  }
  await promiseTimeout(0);
};
