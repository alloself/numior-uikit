import { computed, toValue, type MaybeRefOrGetter, type Plugin } from 'vue';
import { ICONS_KEY, provideIcons, type IconRegistry } from '../icons/icon-registry';
import { DEFAULT_LOCALE, LOCALE_KEY, provideLocale } from '../locale/locale-context';
import { createToastStore, type ToastStoreOptions } from '../toast/toast-store';
import { TOASTS_KEY, provideToasts } from '../toast/useToast';

export interface NuiConfigOptions {
  readonly icons?: IconRegistry | undefined;
  readonly toasts?: ToastStoreOptions | undefined;
  readonly locale?: MaybeRefOrGetter<string | undefined> | undefined;
}

export const provideNuiConfig = (options: NuiConfigOptions): void => {
  if (options.icons) {
    provideIcons(options.icons);
  }
  if (options.toasts) {
    provideToasts(createToastStore(options.toasts));
  }
  if (options.locale !== undefined) {
    provideLocale(options.locale);
  }
};

export const createNuiConfig = (options: NuiConfigOptions): Plugin => ({
  install(app) {
    if (options.icons) {
      app.provide(ICONS_KEY, { ...options.icons });
    }
    app.provide(TOASTS_KEY, createToastStore(options.toasts));
    if (options.locale !== undefined) {
      const locale = options.locale;

      app.provide(
        LOCALE_KEY,
        computed(() => toValue(locale) || DEFAULT_LOCALE),
      );
    }
  },
});
