import {
  computed,
  inject,
  provide,
  toValue,
  type ComputedRef,
  type InjectionKey,
  type MaybeRefOrGetter,
} from 'vue';

export const DEFAULT_LOCALE = 'en-US';

export const LOCALE_KEY: InjectionKey<ComputedRef<string>> = Symbol('nui:locale');

export const provideLocale = (locale: MaybeRefOrGetter<string | undefined>): void => {
  const parent = inject(LOCALE_KEY, null);
  provide(
    LOCALE_KEY,
    computed(() => toValue(locale) || parent?.value || DEFAULT_LOCALE),
  );
};

export const useLocale = (explicit?: MaybeRefOrGetter<string | undefined>): ComputedRef<string> => {
  const inherited = inject(LOCALE_KEY, null);
  return computed(() => toValue(explicit) || inherited?.value || DEFAULT_LOCALE);
};
