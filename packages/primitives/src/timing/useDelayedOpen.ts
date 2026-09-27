import { useTimeoutFn } from '@vueuse/core';
import { toValue, type MaybeRefOrGetter, type Ref } from 'vue';

export interface DelayedOpenOptions {
  readonly openDelay?: MaybeRefOrGetter<number | undefined>;
  readonly closeDelay?: MaybeRefOrGetter<number | undefined>;
}

export interface DelayedOpen {
  scheduleOpen(): void;
  scheduleClose(): void;
  openNow(): void;
  closeNow(): void;
  cancel(): void;
}

export const useDelayedOpen = (
  open: Ref<boolean>,
  options: DelayedOpenOptions = {},
): DelayedOpen => {
  let next = false;
  let delay = 0;

  const timer = useTimeoutFn(
    () => {
      open.value = next;
    },
    () => delay,
    { immediate: false },
  );

  const schedule = (value: boolean, wait: number): void => {
    timer.stop();
    if (wait <= 0) {
      open.value = value;
      return;
    }
    next = value;
    delay = wait;
    timer.start();
  };

  return {
    scheduleOpen: () => schedule(true, toValue(options.openDelay) ?? 0),
    scheduleClose: () => schedule(false, toValue(options.closeDelay) ?? 0),
    openNow: () => schedule(true, 0),
    closeNow: () => schedule(false, 0),
    cancel: timer.stop,
  };
};
