import { tryOnScopeDispose, useTimeoutFn } from '@vueuse/core';

export type AfterRelease = (event: MouseEvent, action: () => void) => void;

export const useAfterRelease = (): AfterRelease => {
  let pending: (() => void) | undefined;

  const timer = useTimeoutFn(
    () => {
      const action = pending;

      pending = undefined;
      action?.();
    },
    0,
    { immediate: false },
  );

  const released = (): void => {
    window.removeEventListener('pointerup', released, true);
    window.removeEventListener('pointercancel', released, true);
    timer.start();
  };

  const drop = (): void => {
    window.removeEventListener('pointerup', released, true);
    window.removeEventListener('pointercancel', released, true);
    timer.stop();
    pending = undefined;
  };

  tryOnScopeDispose(drop);

  return (event, action) => {
    drop();

    if (event.buttons === 0) {
      action();
      return;
    }

    pending = action;
    window.addEventListener('pointerup', released, true);
    window.addEventListener('pointercancel', released, true);
  };
};
