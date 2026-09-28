import { computed, provide, toValue, type MaybeRefOrGetter, type Plugin } from 'vue';
import {
  COLOR_SCHEME_KEY,
  createColorSchemeControl,
  useColorScheme,
  type ColorSchemeOptions,
} from '../color-scheme/useColorScheme';
import { DIRECTION_KEY, provideDirection, type Direction } from '../direction/direction-context';
import { ICONS_KEY, provideIcons, type IconRegistry } from '../icons/icon-registry';
import { DEFAULT_LOCALE, LOCALE_KEY, provideLocale } from '../locale/locale-context';
import {
  MESSAGES_KEY,
  createMessageLayers,
  provideMessages,
  type NuiLocaleMessages,
  type NuiTranslate,
} from '../messages/messages';
import { createToastStore, type ToastStoreOptions } from '../toast/toast-store';
import { TOASTS_KEY, provideToasts } from '../toast/useToast';

export interface NuiConfigOptions {
  readonly icons?: IconRegistry | undefined;
  readonly toasts?: ToastStoreOptions | undefined;
  readonly locale?: MaybeRefOrGetter<string | undefined> | undefined;
  readonly dir?: MaybeRefOrGetter<Direction | undefined> | undefined;
  readonly messages?: MaybeRefOrGetter<NuiLocaleMessages | undefined> | undefined;
  readonly translate?: NuiTranslate | undefined;
  readonly colorScheme?: ColorSchemeOptions | undefined;
}

const hasMessages = (options: NuiConfigOptions): boolean =>
  options.messages !== undefined || options.translate !== undefined;

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
  if (options.dir !== undefined) {
    provideDirection(options.dir);
  }
  if (hasMessages(options)) {
    provideMessages(options);
  }
  if (options.colorScheme !== undefined) {
    provide(COLOR_SCHEME_KEY, useColorScheme(options.colorScheme));
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
    if (options.dir !== undefined) {
      const dir = options.dir;

      app.provide(
        DIRECTION_KEY,
        computed(() => toValue(dir)),
      );
    }
    if (hasMessages(options)) {
      app.provide(MESSAGES_KEY, createMessageLayers(options));
    }
    if (options.colorScheme !== undefined) {
      const handle = createColorSchemeControl(options.colorScheme);

      app.provide(COLOR_SCHEME_KEY, handle);
      app.onUnmount(handle.stop);
    }
  },
});
