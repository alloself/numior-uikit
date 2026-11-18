import { nextTick, createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { COLOR_SCHEME_KEY, createColorSchemeControl, type ColorSchemeControl } from '../../src';
import ColorSchemeProbe from '../fixtures/ColorSchemeProbe.vue';

export interface SchemeHydration {
  readonly server: string;
  readonly hydrated: string;
  readonly warnings: readonly string[];
}

const STORAGE_KEY = 'nui-theme';

const appWith = (control: ColorSchemeControl) =>
  createSSRApp(ColorSchemeProbe).provide(COLOR_SCHEME_KEY, control);

export const startedScheme = (): ColorSchemeControl => {
  const control = createColorSchemeControl({ storageKey: STORAGE_KEY });

  control.start();

  return control;
};

export const hydrateSchemeProbe = async (client: ColorSchemeControl): Promise<SchemeHydration> => {
  const host = document.createElement('div');
  const warnings: string[] = [];

  const server = await renderToString(
    appWith(createColorSchemeControl({ storageKey: STORAGE_KEY })),
  );

  host.innerHTML = server;
  document.body.append(host);

  const app = appWith(client);

  app.config.warnHandler = (message) => {
    warnings.push(message);
  };

  app.mount(host);
  await nextTick();

  const hydrated = host.innerHTML;

  app.unmount();
  host.remove();

  return { server, hydrated, warnings };
};
