import type {
  ColorScheme,
  Direction,
  IconRegistry,
  NuiLinkComponent,
  NuiLocaleMessages,
  NuiTranslate,
  ToastStoreOptions,
} from '@numior/vue';

export interface NuiNuxtColorScheme {
  readonly storageKey?: string | undefined;
  readonly initial?: ColorScheme | undefined;
}

export interface NuiNuxtOptions {
  readonly locale?: string | undefined;
  readonly dir?: Direction | undefined;
  readonly colorScheme?: NuiNuxtColorScheme | false | undefined;
  readonly toasts?: ToastStoreOptions | undefined;
  readonly css?: boolean | undefined;
  readonly components?: boolean | undefined;
  readonly composables?: boolean | undefined;
}

export interface NuiRuntimeOptions {
  readonly locale?: string | undefined;
  readonly dir?: Direction | undefined;
  readonly colorScheme?: NuiNuxtColorScheme | undefined;
  readonly toasts?: ToastStoreOptions | undefined;
}

export interface NuiAppConfig {
  readonly locale?: string | undefined;
  readonly dir?: Direction | undefined;
  readonly messages?: NuiLocaleMessages | undefined;
  readonly translate?: NuiTranslate | undefined;
  readonly icons?: IconRegistry | undefined;
  readonly link?: NuiLinkComponent | undefined;
}

declare module 'nuxt/schema' {
  interface NuxtConfig {
    numior?: NuiNuxtOptions;
  }

  interface NuxtOptions {
    numior?: NuiNuxtOptions;
  }

  interface PublicRuntimeConfig {
    numior: NuiRuntimeOptions;
  }

  interface AppConfigInput {
    numior?: NuiAppConfig;
  }

  interface AppConfig {
    numior?: NuiAppConfig;
  }
}
