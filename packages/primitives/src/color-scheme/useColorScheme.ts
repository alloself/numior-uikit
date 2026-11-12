import {
  computed,
  effectScope,
  inject,
  onMounted,
  onScopeDispose,
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

const isColorScheme = (value: unknown): value is ColorScheme => SCHEMES.has(value);

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
    const attribute = scopeElement()?.getAttribute('data-nui-theme');

    scheme.value =
      readStored(options.storageKey) ?? (isColorScheme(attribute) ? attribute : scheme.value);

    if (typeof window.matchMedia === 'function') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');

      const follow = (): void => {
        systemDark.value = media.matches;
      };

      follow();
      media.addEventListener('change', follow);
      onScopeDispose(() => media.removeEventListener('change', follow));
    }

    watchEffect(() => {
      scopeElement()?.setAttribute('data-nui-theme', scheme.value);
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
  `(function(){var s=${JSON.stringify(initial ?? null)};try{var v=localStorage.getItem(${JSON.stringify(storageKey)});if(${JSON.stringify(CYCLE)}.indexOf(v)>=0){s=v}}catch(e){}if(s){document.documentElement.setAttribute('data-nui-theme',s)}})()`;
