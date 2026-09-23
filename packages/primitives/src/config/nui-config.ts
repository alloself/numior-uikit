import type { Plugin } from 'vue';
import { ICONS_KEY, provideIcons, type IconRegistry } from '../icons/icon-registry';

export interface NuiConfigOptions {
  readonly icons?: IconRegistry | undefined;
}

export const provideNuiConfig = (options: NuiConfigOptions): void => {
  if (options.icons) {
    provideIcons(options.icons);
  }
};

export const createNuiConfig = (options: NuiConfigOptions): Plugin => {
  return {
    install(app) {
      if (options.icons) {
        app.provide(ICONS_KEY, { ...options.icons });
      }
    },
  };
};
