import type { Toast } from '@numior/primitives';

const FOCUS_TARGETS = '[tabindex], button, [href], input, select, textarea';

export const stayingNear = (toasts: readonly Toast[], index: number): Toast | undefined =>
  toasts.find((toast, at) => at > index && !toast.leaving) ??
  toasts.findLast((toast, at) => at < index && !toast.leaving);

export const focusTargetIn = (wrapper: HTMLElement): HTMLElement | undefined =>
  wrapper.querySelector<HTMLElement>(FOCUS_TARGETS) ?? undefined;

export const keyboardFocused = (): boolean =>
  document.activeElement?.matches(':focus-visible') === true;
