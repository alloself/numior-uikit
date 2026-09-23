import type { Plugin } from 'vue';
import { ICONS_KEY, provideIcons, type IconRegistry } from '../icons/icon-registry';
import { createToastStore, type ToastStoreOptions } from '../toast/toast-store';
import { TOASTS_KEY, provideToasts } from '../toast/useToast';

export interface NuiConfigOptions {
  readonly icons?: IconRegistry | undefined;
  readonly toasts?: ToastStoreOptions | undefined;
}

export const provideNuiConfig = (options: NuiConfigOptions): void => {
  if (options.icons) {
    provideIcons(options.icons);
  }
  if (options.toasts) {
    provideToasts(createToastStore(options.toasts));
  }
};

export const createNuiConfig = (options: NuiConfigOptions): Plugin => ({
  install(app) {
    if (options.icons) {
      app.provide(ICONS_KEY, { ...options.icons });
    }
    app.provide(TOASTS_KEY, createToastStore(options.toasts));
  },
});
