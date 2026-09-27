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

interface ColorSchemeSetup {
  readonly control: ColorSchemeControl;
  start(): void;
}

const createColorScheme = (options: ColorSchemeOptions): ColorSchemeSetup => {
  const scheme = ref<ColorScheme>(options.initial ?? 'system');
  const systemDark = ref(false);

  const resolved = computed<ResolvedColorScheme>(() =>
    scheme.value === 'system' ? (systemDark.value ? 'dark' : 'light') : scheme.value,
  );

  const scopeElement = (): HTMLElement | null =>
    toValue(options.scope) ?? (typeof document === 'undefined' ? null : document.documentElement);

  const start = (): void => {
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

  return {
    control: {
      scheme,
      resolved,
      systemDark,
      set: (next) => {
        scheme.value = next;
      },
      toggle: () => {
        scheme.value = resolved.value === 'dark' ? 'light' : 'dark';
      },
      cycle: () => {
        scheme.value = CYCLE[(CYCLE.indexOf(scheme.value) + 1) % CYCLE.length] ?? 'system';
      },
    },
    start,
  };
};

export const createColorSchemeControl = (options: ColorSchemeOptions = {}): ColorSchemeControl => {
  const { control, start } = createColorScheme(options);

  if (typeof window !== 'undefined') {
    effectScope(true).run(start);
  }
  return control;
};

export const useColorScheme = (options?: ColorSchemeOptions): ColorSchemeControl => {
  if (options === undefined) {
    const shared = inject(COLOR_SCHEME_KEY, null);

    if (shared) {
      return shared;
    }
  }
  const { control, start } = createColorScheme(options ?? {});

  onMounted(start);
  return control;
};

export const colorSchemeScript = (storageKey: string): string =>
  `(function(){try{var s=localStorage.getItem(${JSON.stringify(storageKey)});if(s==='light'||s==='dark'||s==='system'){document.documentElement.setAttribute('data-nui-theme',s)}}catch(e){}})()`;
