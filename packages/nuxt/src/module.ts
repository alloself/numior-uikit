import {
  addComponent,
  addImports,
  addPlugin,
  createResolver,
  defineNuxtModule,
  tryResolveModule,
} from '@nuxt/kit';
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

const VUE = '@numior/vue';
const FORMS = '@numior/forms';
const DEFAULT_STORAGE_KEY = 'nui-theme';
const YIELDING_PRIORITY = -1;
const KIT_CSS = ['@numior/tokens/theme.css', '@numior/tokens/base.css', `${VUE}/styles.css`];

interface Registration {
  readonly components: boolean;
  readonly composables: boolean;
}

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

const hasForms = async (nuxt: Nuxt): Promise<boolean> =>
  (await tryResolveModule(FORMS, nuxt.options.modulesDir)) !== undefined;

export default defineNuxtModule<NuiNuxtOptions>({
  meta: {
    name: '@numior/nuxt',
    configKey: 'numior',
    compatibility: { nuxt: '>=4.0.0' },
  },
  defaults: { css: true, components: true, composables: true },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);
    const forms = await hasForms(nuxt);

    const registration = {
      components: options.components === true,
      composables: options.composables === true,
    };

    nuxt.options.runtimeConfig.public.numior = runtimeOptionsOf(options);
    addHead(nuxt, colorSchemeOf(options));
    if (options.css === true) {
      nuxt.options.css.push(...KIT_CSS, ...(forms ? [`${FORMS}/styles.css`] : []));
    }
    registerNamespace(VUE, await import('@numior/vue'), registration);
    if (forms) {
      registerNamespace(FORMS, await import('@numior/forms'), registration);
    }
    addPlugin(resolver.resolve('./runtime/plugin'));
  },
});
