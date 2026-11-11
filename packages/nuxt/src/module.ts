import {
  addComponent,
  addImports,
  addPlugin,
  addVitePlugin,
  createResolver,
  defineNuxtModule,
  tryResolveModule,
} from '@nuxt/kit';
import tailwindcss from '@tailwindcss/vite';
import { colorSchemeScript } from '@numior/vue';
import type { Nuxt } from '@nuxt/schema';
import { componentNames, composableNames, type ModuleNamespace } from './exports';
import type { NuiNuxtColorScheme, NuiNuxtOptions, NuiRuntimeOptions } from './module.types';

export type {
  NuiAppConfig,
  NuiNuxtColorScheme,
  NuiNuxtOptions,
  NuiRuntimeOptions,
} from './module.types';

interface OptionalPackage {
  readonly id: string;
  readonly load: () => Promise<ModuleNamespace>;
}

interface Registration {
  readonly components: boolean;
  readonly composables: boolean;
}

type VitePlugins = Extract<Parameters<typeof addVitePlugin>[0], readonly unknown[]>;

const VUE = '@numior/vue';
const DEFAULT_STORAGE_KEY = 'nui-theme';
const YIELDING_PRIORITY = -1;
const KIT_CSS = ['@numior/tokens/theme.css', '@numior/tokens/base.css', `${VUE}/styles.css`];

const OPTIONAL: readonly OptionalPackage[] = [
  { id: '@numior/forms', load: () => import('@numior/forms') },
  { id: '@numior/table', load: () => import('@numior/table') },
];

const isVitePlugins = (value: unknown): value is VitePlugins =>
  Array.isArray(value) &&
  value.every((plugin) => typeof plugin === 'object' && plugin !== null && 'name' in plugin);

const addTailwind = (): void => {
  const plugins: unknown = tailwindcss();

  if (isVitePlugins(plugins)) {
    addVitePlugin(plugins);
  }
};

const registerNamespace = (id: string, namespace: ModuleNamespace, what: Registration): void => {
  if (what.components) {
    for (const name of componentNames(namespace)) {
      addComponent({ name, export: name, filePath: id });
    }
  }
  if (what.composables) {
    addImports(
      composableNames(namespace).map((name) => ({ name, from: id, priority: YIELDING_PRIORITY })),
    );
  }
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

const installedOf = async (nuxt: Nuxt): Promise<OptionalPackage[]> => {
  const resolved = await Promise.all(
    OPTIONAL.map((entry) => tryResolveModule(entry.id, nuxt.options.modulesDir)),
  );

  return OPTIONAL.filter((_, index) => resolved[index] !== undefined);
};

export default defineNuxtModule<NuiNuxtOptions>({
  meta: {
    name: '@numior/nuxt',
    configKey: 'numior',
    compatibility: { nuxt: '>=4.0.0' },
  },
  defaults: { css: true, components: true, composables: true },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);
    const installed = await installedOf(nuxt);

    const registration = {
      components: options.components === true,
      composables: options.composables === true,
    };

    nuxt.options.runtimeConfig.public.numior = runtimeOptionsOf(options);
    addHead(nuxt, colorSchemeOf(options));
    if (options.css === true) {
      addTailwind();
      nuxt.options.css.push(...KIT_CSS, ...installed.map((entry) => `${entry.id}/styles.css`));
    }
    registerNamespace(VUE, await import('@numior/vue'), registration);

    const loaded = await Promise.all(
      installed.map(async (entry) => ({ id: entry.id, namespace: await entry.load() })),
    );

    for (const entry of loaded) {
      registerNamespace(entry.id, entry.namespace, registration);
    }
    addPlugin(resolver.resolve('./runtime/plugin'));
  },
});
