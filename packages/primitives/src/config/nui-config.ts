import type { Plugin } from 'vue';
import { ICONS_KEY, provideIcons, type IconRegistry } from '../icons/icon-registry';

export interface NuiConfigOptions {
  /** Icon aliases that override the kit defaults for the configured subtree. */
  readonly icons?: IconRegistry | undefined;
}

/** Provide configuration from a component's setup(); a config provider component wraps this. */
export function provideNuiConfig(options: NuiConfigOptions): void {
  if (options.icons) provideIcons(options.icons);
}

/** App-level equivalent: `app.use(createNuiConfig({ icons }))`. */
export function createNuiConfig(options: NuiConfigOptions): Plugin {
  return {
    install(app) {
      if (options.icons) app.provide(ICONS_KEY, { ...options.icons });
    },
  };
}
