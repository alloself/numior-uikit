import { getCurrentScope, onScopeDispose, toValue, type MaybeRefOrGetter, type Ref } from 'vue';

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
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = (): void => {
    if (timer === undefined) {
      return;
    }
    clearTimeout(timer);
    timer = undefined;
  };
  const schedule = (next: boolean, delay: number): void => {
    cancel();
    if (delay <= 0) {
      open.value = next;
      return;
    }
    timer = setTimeout(() => {
      timer = undefined;
      open.value = next;
    }, delay);
  };
  if (getCurrentScope()) {
    onScopeDispose(cancel);
  }
  return {
    scheduleOpen: () => schedule(true, toValue(options.openDelay) ?? 0),
    scheduleClose: () => schedule(false, toValue(options.closeDelay) ?? 0),
    openNow: () => schedule(true, 0),
    closeNow: () => schedule(false, 0),
    cancel,
  };
};
