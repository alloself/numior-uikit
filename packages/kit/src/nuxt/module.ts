import { colorSchemeScript } from '@numior/vue';
import { addComponent, addImports, addPlugin, createResolver, defineNuxtModule } from 'nuxt/kit';
import type { Nuxt } from 'nuxt/schema';
import { componentNames, composableNames, type ModuleNamespace } from './exports';
import type { NuiNuxtColorScheme, NuiNuxtOptions, NuiRuntimeOptions } from './module.types';

export type {
  NuiAppConfig,
  NuiNuxtColorScheme,
  NuiNuxtOptions,
  NuiRuntimeOptions,
} from './module.types';

interface KitEntry {
  readonly id: string;
  readonly styles: string;
  readonly load: () => Promise<ModuleNamespace>;
}

interface Registration {
  readonly components: boolean;
  readonly composables: boolean;
}

const DEFAULT_STORAGE_KEY = 'nui-theme';
const YIELDING_PRIORITY = -1;
const TOKEN_CSS = ['@numior/kit/theme.css', '@numior/kit/base.css'];

const ENTRIES: readonly KitEntry[] = [
  { id: '@numior/kit', styles: '@numior/kit/styles.css', load: () => import('@numior/vue') },
  {
    id: '@numior/kit/forms',
    styles: '@numior/kit/forms/styles.css',
    load: () => import('@numior/forms'),
  },
  {
    id: '@numior/kit/table',
    styles: '@numior/kit/table/styles.css',
    load: () => import('@numior/table'),
  },
];

const registerNamespace = (id: string, namespace: ModuleNamespace, what: Registration): void => {
  if (what.components) {
    for (const name of componentNames(namespace)) {
      addComponent({ name, export: name, filePath: id });
    }
  }
  if (!what.composables) {
    return;
  }

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

    const registration = {
      components: options.components === true,
      composables: options.composables === true,
    };

    nuxt.options.runtimeConfig.public.numior = runtimeOptionsOf(options);
    addHead(nuxt, colorSchemeOf(options));
    if (options.css === true) {
      for (const sheet of [...TOKEN_CSS, ...ENTRIES.map((entry) => entry.styles)]) {
        nuxt.options.css.push(sheet);
      }
    }

    const loaded = await Promise.all(
      ENTRIES.map(async (entry) => ({ id: entry.id, namespace: await entry.load() })),
    );

    for (const entry of loaded) {
      registerNamespace(entry.id, entry.namespace, registration);
    }
    addPlugin(resolver.resolve('./runtime/plugin'));
  },
});
