import { syncRef, usePreferredDark } from '@vueuse/core';
import {
  computed,
  effectScope,
  inject,
  onMounted,
  ref,
  toValue,
  watch,
  watchEffect,
  type ComputedRef,
  type InjectionKey,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';
import { ColorScheme, type ResolvedColorScheme } from './color-scheme.types';

export interface ColorSchemeOptions {
  readonly scope?: MaybeRefOrGetter<HTMLElement | null | undefined>;
  readonly initial?: ColorScheme | undefined;
  readonly storageKey?: string | undefined;
}

export interface ColorSchemeControl {
  readonly scheme: Ref<ColorScheme>;
  readonly resolved: ComputedRef<ResolvedColorScheme>;
  readonly systemDark: Readonly<Ref<boolean>>;
  start(): void;
  set(next: ColorScheme): void;
  toggle(): void;
  cycle(): void;
}

type StartRunner = (begin: () => void) => void;

export interface ColorSchemeHandle extends ColorSchemeControl {
  stop(): void;
}

export const COLOR_SCHEME_KEY: InjectionKey<ColorSchemeControl> = Symbol('nui-color-scheme');

const CYCLE: readonly ColorScheme[] = [ColorScheme.Light, ColorScheme.Dark, ColorScheme.System];

const SCHEMES: ReadonlySet<unknown> = new Set(CYCLE);

const OPPOSITE: Record<ResolvedColorScheme, ResolvedColorScheme> = {
  [ColorScheme.Light]: ColorScheme.Dark,
  [ColorScheme.Dark]: ColorScheme.Light,
};

const SCHEME_CLASS = 'nui-theme--';

const isColorScheme = (value: unknown): value is ColorScheme => SCHEMES.has(value);

const schemeClassOf = (scheme: ColorScheme): string => `${SCHEME_CLASS}${scheme}`;

const SCHEME_CLASSES: readonly string[] = CYCLE.map(schemeClassOf);

const schemeOfElement = (element: HTMLElement | null): ColorScheme | undefined =>
  CYCLE.find((scheme) => element?.classList.contains(schemeClassOf(scheme)) === true);

const writeScheme = (element: HTMLElement | null, scheme: ColorScheme): void => {
  if (element === null) {
    return;
  }

  for (const name of SCHEME_CLASSES) {
    element.classList.toggle(name, name === schemeClassOf(scheme));
  }
};

const readStored = (key: string | undefined): ColorScheme | undefined => {
  if (!key) {
    return undefined;
  }
  try {
    const value = localStorage.getItem(key);
    return isColorScheme(value) ? value : undefined;
  } catch {
    return undefined;
  }
};

const writeStored = (key: string | undefined, value: ColorScheme): void => {
  if (!key) {
    return;
  }
  try {
    localStorage.setItem(key, value);
  } catch {
    return;
  }
};

const createColorScheme = (options: ColorSchemeOptions, run: StartRunner): ColorSchemeControl => {
  const scheme = ref<ColorScheme>(options.initial ?? ColorScheme.System);
  const systemDark = ref(false);
  let started = false;

  const resolved = computed<ResolvedColorScheme>(() =>
    scheme.value === ColorScheme.System
      ? systemDark.value
        ? ColorScheme.Dark
        : ColorScheme.Light
      : scheme.value,
  );

  const scopeElement = (): HTMLElement | null =>
    toValue(options.scope) ?? (typeof document === 'undefined' ? null : document.documentElement);

  const begin = (): void => {
    scheme.value =
      readStored(options.storageKey) ?? schemeOfElement(scopeElement()) ?? scheme.value;

    syncRef(usePreferredDark(), systemDark, { direction: 'ltr' });

    watchEffect(() => {
      writeScheme(scopeElement(), scheme.value);
    });

    watch(scheme, (next) => {
      writeStored(options.storageKey, next);
    });
  };

  const start = (): void => {
    if (started || typeof window === 'undefined') {
      return;
    }
    started = true;
    run(begin);
  };

  return {
    scheme,
    resolved,
    systemDark,
    start,
    set: (next) => {
      start();

      if (next === scheme.value) {
        writeStored(options.storageKey, next);
      }
      scheme.value = next;
    },
    toggle: () => {
      start();
      scheme.value = OPPOSITE[resolved.value];
    },
    cycle: () => {
      start();
      scheme.value = CYCLE[(CYCLE.indexOf(scheme.value) + 1) % CYCLE.length] ?? ColorScheme.System;
    },
  };
};

const runInline: StartRunner = (begin) => {
  begin();
};

export const createColorSchemeControl = (options: ColorSchemeOptions = {}): ColorSchemeHandle => {
  const scope = effectScope(true);

  const control = createColorScheme(options, (begin) => {
    scope.run(begin);
  });

  return { ...control, stop: () => scope.stop() };
};

export const useColorScheme = (options?: ColorSchemeOptions): ColorSchemeControl => {
  const shared = options === undefined ? inject(COLOR_SCHEME_KEY, null) : null;
  const control = shared ?? createColorScheme(options ?? {}, runInline);

  onMounted(() => {
    control.start();
  });

  return control;
};

export const colorSchemeScript = (storageKey: string, initial?: ColorScheme): string =>
  `(function(){var s=${JSON.stringify(initial ?? null)};try{var v=localStorage.getItem(${JSON.stringify(storageKey)});if(${JSON.stringify(CYCLE)}.indexOf(v)>=0){s=v}}catch(e){}if(s){var c=document.documentElement.classList;c.remove(${SCHEME_CLASSES.map((name) => JSON.stringify(name)).join(',')});c.add(${JSON.stringify(SCHEME_CLASS)}+s)}})()`;
