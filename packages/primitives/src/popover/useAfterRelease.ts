import { tryOnScopeDispose, useTimeoutFn } from '@vueuse/core';
import { usePointerSession } from '../pointer/usePointerSession';

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

  const session = usePointerSession({ capture: true });

  const released = (): void => {
    session.end();
    timer.start();
  };

  const drop = (): void => {
    session.end();
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
    session.begin({ up: released, cancel: released });
  };
};
