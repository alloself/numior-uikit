import {
  computed,
  effectScope,
  inject,
  onMounted,
  onScopeDispose,
  ref,
  toValue,
  watchEffect,
  type ComputedRef,
  type InjectionKey,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';

export type ColorScheme = 'system' | 'light' | 'dark';

export type ResolvedColorScheme = 'light' | 'dark';

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

export const COLOR_SCHEME_KEY: InjectionKey<ColorSchemeControl> = Symbol('nui-color-scheme');

const CYCLE: readonly ColorScheme[] = ['light', 'dark', 'system'];

const isColorScheme = (value: unknown): value is ColorScheme =>
  value === 'system' || value === 'light' || value === 'dark';

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

type StartRunner = (begin: () => void) => void;

const createColorScheme = (options: ColorSchemeOptions, run: StartRunner): ColorSchemeControl => {
  const scheme = ref<ColorScheme>(options.initial ?? 'system');
  const systemDark = ref(false);
  let started = false;

  const resolved = computed<ResolvedColorScheme>(() =>
    scheme.value === 'system' ? (systemDark.value ? 'dark' : 'light') : scheme.value,
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
      writeStored(options.storageKey, scheme.value);
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
      scheme.value = next;
    },
    toggle: () => {
      start();
      scheme.value = resolved.value === 'dark' ? 'light' : 'dark';
    },
    cycle: () => {
      start();
      scheme.value = CYCLE[(CYCLE.indexOf(scheme.value) + 1) % CYCLE.length] ?? 'system';
    },
  };
};

const runInline: StartRunner = (begin) => {
  begin();
};

export interface ColorSchemeHandle extends ColorSchemeControl {
  stop(): void;
}

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
  `(function(){var s=${JSON.stringify(initial ?? null)};try{var v=localStorage.getItem(${JSON.stringify(storageKey)});if(v==='light'||v==='dark'||v==='system'){s=v}}catch(e){}if(s){document.documentElement.setAttribute('data-nui-theme',s)}})()`;
