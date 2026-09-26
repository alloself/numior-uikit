import {
  computed,
  inject,
  provide,
  toValue,
  type ComputedRef,
  type InjectionKey,
  type MaybeRefOrGetter,
} from 'vue';
import { DEFAULT_LOCALE, useLocale } from '../locale/locale-context';

export interface NuiMessages {}

export type NuiMessageNamespace = keyof NuiMessages;

type BuiltInLocale = 'en' | 'ru';

export interface NuiMessageCatalog<N extends NuiMessageNamespace> {
  readonly namespace: N;
  readonly en: NuiMessages[N];
  readonly ru: NuiMessages[N];
}

export type NuiMessageOverrides = {
  readonly [N in NuiMessageNamespace]?: Partial<NuiMessages[N]>;
};

export type NuiLocaleMessages = Readonly<Record<string, NuiMessageOverrides>>;

export type NuiMessageParams = Readonly<Record<string, unknown>>;

export type NuiTranslate = (
  key: string,
  params: NuiMessageParams | undefined,
  locale: string,
) => string | undefined;

interface MessageOptions {
  readonly messages?: MaybeRefOrGetter<NuiLocaleMessages | undefined> | undefined;
  readonly translate?: NuiTranslate | undefined;
}

interface MessageLayers {
  readonly messages: readonly NuiLocaleMessages[];
  readonly translators: readonly NuiTranslate[];
}

const NO_LAYERS: MessageLayers = { messages: [], translators: [] };

export const MESSAGES_KEY: InjectionKey<ComputedRef<MessageLayers>> = Symbol('nui:messages');

export const createMessageLayers = (
  { messages, translate }: MessageOptions,
  parent: ComputedRef<MessageLayers> | null = null,
): ComputedRef<MessageLayers> =>
  computed(() => {
    const inherited = parent?.value ?? NO_LAYERS;
    const own = toValue(messages);

    return {
      messages: own ? [...inherited.messages, own] : inherited.messages,
      translators: translate ? [translate, ...inherited.translators] : inherited.translators,
    };
  });

export const provideMessages = (options: MessageOptions): void => {
  provide(MESSAGES_KEY, createMessageLayers(options, inject(MESSAGES_KEY, null)));
};

const baseName = (locale: string): string => {
  try {
    return new Intl.Locale(locale).baseName;
  } catch {
    return DEFAULT_LOCALE;
  }
};

const localeChain = (locale: string): readonly string[] => {
  const subtags = baseName(locale).split('-');
  const tags = subtags.map((_, index) => subtags.slice(0, index + 1).join('-'));

  return ['en', ...tags.filter((tag) => tag !== 'en')];
};

const isBuiltInLocale = (tag: string): tag is BuiltInLocale => tag === 'en' || tag === 'ru';

const builtIn = <N extends NuiMessageNamespace>(
  catalog: NuiMessageCatalog<N>,
  tag: string,
): NuiMessages[N] | undefined => (isBuiltInLocale(tag) ? catalog[tag] : undefined);

const merge = <T extends object>(base: T, patch: Partial<T> | undefined): T => ({
  ...base,
  ...patch,
});

const resolveMessages = <N extends NuiMessageNamespace>(
  catalog: NuiMessageCatalog<N>,
  layers: readonly NuiLocaleMessages[],
  locale: string,
): NuiMessages[N] =>
  localeChain(locale).reduce<NuiMessages[N]>(
    (merged, tag) =>
      layers.reduce<NuiMessages[N]>(
        (inner, layer) => merge(inner, layer[tag]?.[catalog.namespace]),
        merge(merged, builtIn(catalog, tag)),
      ),
    catalog.en,
  );

const translation = (
  translators: readonly NuiTranslate[],
  key: string,
  params: NuiMessageParams | undefined,
  locale: string,
): string | undefined =>
  translators.reduce<string | undefined>(
    (found, translate) => found ?? translate(key, params, locale),
    undefined,
  );

const translated = <T extends object>(
  messages: T,
  namespace: string,
  translators: readonly NuiTranslate[],
  locale: string,
): T =>
  new Proxy(messages, {
    get: (target, property) => {
      const value: unknown = Reflect.get(target, property);

      if (typeof property !== 'string') {
        return value;
      }

      const key = `${namespace}.${property}`;

      if (typeof value === 'function') {
        return (params?: NuiMessageParams) =>
          translation(translators, key, params, locale) ??
          Reflect.apply(value, undefined, [params]);
      }

      return translation(translators, key, undefined, locale) ?? value;
    },
  });

export const useMessages = <N extends NuiMessageNamespace>(
  catalog: NuiMessageCatalog<N>,
  locale?: MaybeRefOrGetter<string | undefined>,
): ComputedRef<NuiMessages[N]> => {
  const current = useLocale(locale);
  const layers = inject(MESSAGES_KEY, null);

  return computed(() => {
    const { messages, translators } = layers?.value ?? NO_LAYERS;
    const merged = resolveMessages(catalog, messages, current.value);

    return translators.length === 0
      ? merged
      : translated(merged, catalog.namespace, translators, current.value);
  });
};
