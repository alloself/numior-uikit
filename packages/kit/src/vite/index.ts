import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import type { Alias, Plugin, UserConfig, ViteDevServer } from 'vite';
import { importKitComponents } from './components';
import { readManifest } from './manifest';
import { createStylesheet } from './stylesheet';
import type { KitManifest, KitStylesheet, NumiorOptions } from './vite.types';

export type { KitComponent, KitManifest, NumiorOptions } from './vite.types';

const VUE_MODULE = /\.vue(?:$|\?)/u;
const RESOLVED_CALL = '_resolveComponent(';
const KIT_STYLES = /^@numior\/kit\/styles\.css$/u;
const TAILWIND_IMPORT = /^tailwindcss$/u;
const TAILWIND_CSS = 'tailwindcss/index.css';
const DEFAULT_CACHE_DIR = 'node_modules/.vite';
const STYLESHEET = 'numior/styles.css';
const WATCHED_EVENTS = ['add', 'change'];

const kitRequire = createRequire(import.meta.url);

export const tailwindAlias = (): Alias[] => [
  { find: TAILWIND_IMPORT, replacement: kitRequire.resolve(TAILWIND_CSS) },
];

export const stylesheetPath = (config: UserConfig): string =>
  resolve(config.root ?? process.cwd(), config.cacheDir ?? DEFAULT_CACHE_DIR, STYLESHEET);

const tailwindImport = (): Plugin => ({
  name: 'numior:tailwind-import',
  config: () => ({ resolve: { alias: tailwindAlias() } }),
});

const reloadStylesheet = async (
  server: ViteDevServer,
  sheet: KitStylesheet,
  file: string,
): Promise<void> => {
  if (!(await sheet.grow(file))) {
    return;
  }
  const modules = server.moduleGraph.getModulesByFile(sheet.path) ?? new Set();

  await Promise.all([...modules].map((module) => server.reloadModule(module)));
};

export const kitStyles = (manifest: KitManifest, root?: string): Plugin => {
  let sheet: KitStylesheet | undefined;

  return {
    name: 'numior:styles',
    enforce: 'pre',
    config: (config) => {
      sheet = createStylesheet(
        manifest,
        root ?? resolve(config.root ?? process.cwd()),
        stylesheetPath(config),
      );

      return { resolve: { alias: [{ find: KIT_STYLES, replacement: sheet.path }] } };
    },
    buildStart: async () => {
      await sheet?.ready();
    },
    configureServer: (server) => {
      for (const event of WATCHED_EVENTS) {
        server.watcher.on(event, (file: string) => {
          void (sheet === undefined ? undefined : reloadStylesheet(server, sheet, file));
        });
      }
    },
  };
};

export const kitComponents = (manifest: KitManifest): Plugin => ({
  name: 'numior:components',
  enforce: 'post',
  transform: {
    filter: { id: VUE_MODULE, code: RESOLVED_CALL },
    handler: (code, id) => {
      const output = importKitComponents(code, manifest);

      return output === undefined
        ? null
        : { code: output.toString(), map: output.generateMap({ source: id, hires: 'boundary' }) };
    },
  },
});

export const kitPlugins = (
  manifest: KitManifest,
  options: NumiorOptions = {},
  root?: string,
): Plugin[] => [
  ...(options.styles === false ? [] : [kitStyles(manifest, root)]),
  ...(options.tailwind === false ? [] : [tailwindImport(), ...tailwindcss()]),
  ...(options.components === false ? [] : [kitComponents(manifest)]),
];

export const numior = (options: NumiorOptions = {}): Plugin[] =>
  kitPlugins(readManifest(), options);
