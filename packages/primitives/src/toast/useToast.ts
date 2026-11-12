import { inject, provide, type InjectionKey } from 'vue';
import { createToastStore, type ToastOptions, type ToastStore } from './toast-store';
import { ToastTone } from './toast.types';

export type ToastMessageOptions = Omit<ToastOptions, 'title' | 'tone'>;

export interface ToastService {
  show(options: ToastOptions): string;
  success(title: string, options?: ToastMessageOptions): string;
  error(title: string, options?: ToastMessageOptions): string;
  warning(title: string, options?: ToastMessageOptions): string;
  info(title: string, options?: ToastMessageOptions): string;
  dismiss(id: string): void;
  clear(): void;
}

export const TOASTS_KEY: InjectionKey<ToastStore> = Symbol('nui:toasts');

let shared: ToastStore | undefined;

const fallbackStore = (): ToastStore => {
  if (typeof window === 'undefined') {
    return createToastStore();
  }
  shared ??= createToastStore();
  return shared;
};

const withTone =
  (store: ToastStore, tone: ToastTone) =>
  (title: string, options: ToastMessageOptions = {}): string =>
    store.show({ ...options, title, tone });

export const provideToasts = (store: ToastStore): void => {
  provide(TOASTS_KEY, store);
};

export const useToastStore = (): ToastStore => inject(TOASTS_KEY, null) ?? fallbackStore();

export const useToast = (): ToastService => {
  const store = useToastStore();
  return {
    show: (options) => store.show(options),
    success: withTone(store, ToastTone.Success),
    error: withTone(store, ToastTone.Error),
    warning: withTone(store, ToastTone.Warning),
    info: withTone(store, ToastTone.Info),
    dismiss: (id) => store.dismiss(id),
    clear: () => store.clear(),
  };
};
