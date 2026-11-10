import { computed, shallowRef, type ComputedRef, type ShallowRef } from 'vue';
import { createTimers } from './toast-timers';
import type { ToastHold } from './toast.types';

export type ToastTone = 'neutral' | 'info' | 'success' | 'warning' | 'error';

export interface ToastAction {
  readonly label: string;
  readonly onClick: () => void;
}

export interface ToastOptions {
  readonly id?: string | undefined;
  readonly title: string;
  readonly description?: string | undefined;
  readonly tone?: ToastTone | undefined;
  readonly duration?: number | undefined;
  readonly action?: ToastAction | undefined;
  readonly dismissible?: boolean | undefined;
}

export interface Toast {
  readonly id: string;
  readonly title: string;
  readonly description: string | undefined;
  readonly tone: ToastTone;
  readonly duration: number;
  readonly action: ToastAction | undefined;
  readonly dismissible: boolean;
  readonly leaving: boolean;
}

export interface ToastStoreOptions {
  readonly duration?: number | undefined;
  readonly exitDuration?: number | undefined;
  readonly limit?: number | undefined;
}

export interface ToastStore {
  readonly toasts: Readonly<ShallowRef<readonly Toast[]>>;
  readonly visible: ComputedRef<readonly Toast[]>;
  readonly queued: ComputedRef<number>;
  show(options: ToastOptions): string;
  dismiss(id: string): void;
  clear(): void;
  hold(reason: ToastHold): void;
  release(reason: ToastHold): void;
}

const DEFAULT_DURATION = 5000;
const DEFAULT_EXIT_DURATION = 200;

const canSchedule = (): boolean => typeof document !== 'undefined';

const normalizeToast = (options: ToastOptions, id: string, fallbackDuration: number): Toast => ({
  id,
  title: options.title,
  description: options.description,
  tone: options.tone ?? 'neutral',
  duration: options.duration ?? fallbackDuration,
  action: options.action,
  dismissible: options.dismissible ?? true,
  leaving: false,
});

const withLeaving = (toasts: readonly Toast[], ids: ReadonlySet<string>): readonly Toast[] =>
  toasts.map((toast) => (ids.has(toast.id) ? { ...toast, leaving: true } : toast));

const upsert = (toasts: readonly Toast[], next: Toast): readonly Toast[] =>
  toasts.some((toast) => toast.id === next.id)
    ? toasts.map((toast) => (toast.id === next.id ? next : toast))
    : [...toasts, next];

const visibleSlice = (toasts: readonly Toast[], limit: number | undefined): readonly Toast[] =>
  limit === undefined ? toasts : toasts.slice(0, limit);

export const createToastStore = (options: ToastStoreOptions = {}): ToastStore => {
  const fallbackDuration = options.duration ?? DEFAULT_DURATION;
  const exitDuration = options.exitDuration ?? DEFAULT_EXIT_DURATION;
  const toasts = shallowRef<readonly Toast[]>([]);
  const visible = computed(() => visibleSlice(toasts.value, options.limit));
  const timers = createTimers();
  const removals = new Map<string, ReturnType<typeof setTimeout>>();
  const holds = new Set<ToastHold>();
  let counter = 0;

  const settle = (): void => {
    if (!canSchedule()) {
      return;
    }
    for (const toast of visible.value) {
      if (!toast.leaving && toast.duration > 0 && !timers.has(toast.id)) {
        timers.start(toast.id, toast.duration, () => dismiss(toast.id));

        if (holds.size > 0) {
          timers.pause(toast.id);
        }
      }
    }
  };

  const removeAll = (ids: ReadonlySet<string>): void => {
    for (const id of ids) {
      removals.delete(id);
    }
    toasts.value = toasts.value.filter((toast) => !ids.has(toast.id));
    settle();
  };

  const leave = (ids: ReadonlySet<string>): void => {
    if (ids.size === 0) {
      return;
    }
    for (const id of ids) {
      timers.clear(id);
    }
    toasts.value = withLeaving(toasts.value, ids);

    if (!canSchedule()) {
      removeAll(ids);
      return;
    }
    for (const id of ids) {
      removals.set(
        id,
        setTimeout(() => removeAll(new Set([id])), exitDuration),
      );
    }
  };

  const dismiss = (id: string): void => {
    const target = toasts.value.find((toast) => toast.id === id);

    if (target && !target.leaving) {
      leave(new Set([id]));
    }
  };

  const nextId = (): string => {
    counter += 1;
    return `nui-toast-${counter}`;
  };

  const show = (input: ToastOptions): string => {
    const id = input.id ?? nextId();
    const pending = removals.get(id);
    if (pending !== undefined) {
      clearTimeout(pending);
      removals.delete(id);
    }
    timers.clear(id);
    toasts.value = upsert(toasts.value, normalizeToast(input, id, fallbackDuration));
    settle();
    return id;
  };

  return {
    toasts,
    visible,
    queued: computed(() => toasts.value.length - visible.value.length),
    show,
    dismiss,
    clear: () => {
      leave(
        toasts.value.reduce<Set<string>>((ids, toast) => {
          if (!toast.leaving) {
            ids.add(toast.id);
          }
          return ids;
        }, new Set()),
      );
    },
    hold: (reason) => {
      holds.add(reason);

      for (const toast of toasts.value) {
        timers.pause(toast.id);
      }
    },
    release: (reason) => {
      holds.delete(reason);

      if (holds.size === 0) {
        for (const toast of toasts.value) {
          timers.resume(toast.id);
        }
      }
    },
  };
};
