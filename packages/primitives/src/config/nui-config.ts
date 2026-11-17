import { computed, provide, toValue, type MaybeRefOrGetter, type Plugin } from 'vue';
import {
  COLOR_SCHEME_KEY,
  createColorSchemeControl,
  useColorScheme,
  type ColorSchemeOptions,
} from '../color-scheme/useColorScheme';
import { DIRECTION_KEY, provideDirection } from '../direction/direction-context';
import type { Direction } from '../direction/direction.types';
import { ICONS_KEY, provideIcons, type IconRegistry } from '../icons/icon-registry';
import { LINK_KEY, provideLink, type NuiLinkComponent } from '../link/link-context';
import { DEFAULT_LOCALE, LOCALE_KEY, provideLocale } from '../locale/locale-context';
import {
  MESSAGES_KEY,
  createMessageLayers,
  provideMessages,
  type NuiLocaleMessages,
  type NuiTranslate,
} from '../messages/messages';
import { CONTROLS_KEY, provideControls } from '../controls/control-registry';
import { HIGHLIGHTER_KEY, provideHighlighter } from '../highlight/highlighter';
import type { NuiHighlighter } from '../highlight/highlight.types';
import type { NuiControlRegistry } from '../controls/control.types';
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
  readonly link?: NuiLinkComponent | undefined;
  readonly controls?: NuiControlRegistry | undefined;
  readonly highlighter?: NuiHighlighter | false | undefined;
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
  if (options.link !== undefined) {
    provideLink(options.link);
  }
  if (options.controls !== undefined) {
    provideControls(options.controls);
  }
  if (options.highlighter === undefined) {
    return;
  }

  provideHighlighter(options.highlighter);
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

      app.onUnmount(() => {
        handle.stop();
      });
    }
    if (options.link !== undefined) {
      app.provide(LINK_KEY, options.link);
    }
    if (options.controls !== undefined) {
      app.provide(CONTROLS_KEY, options.controls);
    }
    if (options.highlighter === undefined) {
      return;
    }

    app.provide(HIGHLIGHTER_KEY, options.highlighter);
  },
});
