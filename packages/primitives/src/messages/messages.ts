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
import { BuiltInLocale } from './messages.types';

export interface NuiMessageCatalog<M extends object> {
  readonly namespace: string;
  readonly en: M;
  readonly ru: M;
}

type AnyMessages = Readonly<Record<string, Readonly<Record<string, unknown>>>>;

export type NuiMessageOverrides<M extends object = AnyMessages> = {
  readonly [N in keyof M]?: Partial<M[N]>;
};

export type NuiLocaleMessages<M extends object = AnyMessages> = Readonly<
  Record<string, NuiMessageOverrides<M>>
>;

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

  return [BuiltInLocale.En, ...tags.filter((tag) => tag !== BuiltInLocale.En)];
};

const BUILT_IN: ReadonlySet<string> = new Set(Object.values(BuiltInLocale));

const isBuiltInLocale = (tag: string): tag is BuiltInLocale => BUILT_IN.has(tag);

const builtIn = <M extends object>(catalog: NuiMessageCatalog<M>, tag: string): M | undefined =>
  isBuiltInLocale(tag) ? catalog[tag] : undefined;

const fitting = (
  base: object,
  patch: Readonly<Record<string, unknown>> | undefined,
): Readonly<Record<string, unknown>> =>
  Object.fromEntries(
    Object.entries(patch ?? {}).filter(
      ([key, value]) => typeof value === typeof Reflect.get(base, key),
    ),
  );

const overlay = <M extends object>(
  base: M,
  patch: Readonly<Record<string, unknown>> | undefined,
): M => Object.assign({}, base, fitting(base, patch));

const resolveMessages = <M extends object>(
  catalog: NuiMessageCatalog<M>,
  layers: readonly NuiLocaleMessages[],
  locale: string,
): M =>
  localeChain(locale).reduce<M>(
    (merged, tag) =>
      layers.reduce<M>(
        (inner, layer) => overlay(inner, layer[tag]?.[catalog.namespace]),
        Object.assign({}, merged, builtIn(catalog, tag)),
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

export const useMessages = <M extends object>(
  catalog: NuiMessageCatalog<M>,
  locale?: MaybeRefOrGetter<string | undefined>,
): ComputedRef<M> => {
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
