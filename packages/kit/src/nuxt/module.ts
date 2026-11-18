import { colorSchemeScript } from '@numior/vue';
import {
  addComponent,
  addImports,
  addPlugin,
  addTemplate,
  addVitePlugin,
  createResolver,
  defineNuxtModule,
} from 'nuxt/kit';
import type { Nuxt } from 'nuxt/schema';
import { composableNames, type ModuleNamespace } from './exports';
import { kitPlugins } from '../vite/index';
import { readManifest } from '../vite/manifest';
import type { KitManifest } from '../vite/vite.types';
import { kitEntry } from './kit-css';
import type { NuiNuxtColorScheme, NuiNuxtOptions, NuiRuntimeOptions } from './module.types';

export type {
  NuiAppConfig,
  NuiNuxtColorScheme,
  NuiNuxtOptions,
  NuiRuntimeOptions,
} from './module.types';

interface KitEntry {
  readonly id: string;
  readonly load: () => Promise<ModuleNamespace>;
}

type VitePlugins = Extract<Parameters<typeof addVitePlugin>[0], readonly unknown[]>;

const DEFAULT_STORAGE_KEY = 'nui-theme';
const YIELDING_PRIORITY = -1;

const ENTRIES: readonly KitEntry[] = [
  { id: '@numior/kit', load: () => import('@numior/vue') },
  { id: '@numior/kit/forms', load: () => import('@numior/forms') },
  { id: '@numior/kit/table', load: () => import('@numior/table') },
];

const isVitePlugins = (value: unknown): value is VitePlugins =>
  Array.isArray(value) &&
  value.every((plugin) => typeof plugin === 'object' && plugin !== null && 'name' in plugin);

const addStylePlugins = (nuxt: Nuxt, manifest: KitManifest): void => {
  const plugins: unknown = kitPlugins(manifest, { components: false }, nuxt.options.rootDir);

  if (!isVitePlugins(plugins)) {
    return;
  }

  addVitePlugin(plugins);
};

const addKitCss = (nuxt: Nuxt, manifest: KitManifest): void => {
  addStylePlugins(nuxt, manifest);

  const kit = addTemplate({ filename: 'numior/kit.css', write: true, getContents: kitEntry });

  nuxt.options.css.unshift(kit.dst);
};

const registerComponents = (manifest: KitManifest): void => {
  for (const [name, component] of Object.entries(manifest.components)) {
    addComponent({ name, export: name, filePath: component.from });
  }
};

const registerComposables = (id: string, namespace: ModuleNamespace): void => {
  addImports(
    composableNames(namespace).map((name) => ({ name, from: id, priority: YIELDING_PRIORITY })),
  );
};

const colorSchemeOf = (options: NuiNuxtOptions): NuiNuxtColorScheme | undefined => {
  if (options.colorScheme === false) {
    return undefined;
  }
  return {
    storageKey: options.colorScheme?.storageKey ?? DEFAULT_STORAGE_KEY,
    initial: options.colorScheme?.initial,
  };
};

const runtimeOptionsOf = (options: NuiNuxtOptions): NuiRuntimeOptions => ({
  ...(options.locale === undefined ? {} : { locale: options.locale }),
  ...(options.dir === undefined ? {} : { dir: options.dir }),
  ...(options.colorScheme === false ? {} : { colorScheme: colorSchemeOf(options) }),
  ...(options.toasts === undefined ? {} : { toasts: options.toasts }),
});

const addHead = (nuxt: Nuxt, scheme: NuiNuxtColorScheme | undefined): void => {
  if (scheme?.storageKey === undefined) {
    return;
  }
  const head = nuxt.options.app.head;

  head.script = [
    ...(head.script ?? []),
    { innerHTML: colorSchemeScript(scheme.storageKey, scheme.initial) },
  ];
};

export default defineNuxtModule<NuiNuxtOptions>({
  meta: {
    name: '@numior/kit/nuxt',
    configKey: 'numior',
    compatibility: { nuxt: '>=4.0.0' },
  },
  defaults: { css: true, components: true, composables: true },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);
    const manifest = readManifest();

    nuxt.options.runtimeConfig.public.numior = runtimeOptionsOf(options);
    addHead(nuxt, colorSchemeOf(options));
    if (options.css === true) {
      addKitCss(nuxt, manifest);
    }
    if (options.components === true) {
      registerComponents(manifest);
    }
    if (options.composables === true) {
      const loaded = await Promise.all(
        ENTRIES.map(async (entry) => ({ id: entry.id, namespace: await entry.load() })),
      );

      for (const entry of loaded) {
        registerComposables(entry.id, entry.namespace);
      }
    }
    addPlugin(resolver.resolve('./runtime/plugin'));
  },
});
