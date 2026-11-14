import { computed, watch, type ComputedRef, type Ref } from 'vue';
import { createGlobalState, useStorage } from '@vueuse/core';
import { DocsAccent } from '../theme.types';

export interface AccentControl {
  readonly choice: Ref<string>;
  readonly accent: ComputedRef<DocsAccent | undefined>;
}

export const ACCENT_STORAGE_KEY = 'nui-accent';
export const NUMIOR_PALETTE = 'numior';

const ACCENTS: ReadonlySet<string> = new Set(Object.values(DocsAccent));

const isAccent = (value: string): value is DocsAccent => ACCENTS.has(value);

export const SITE_THEME_CLASS = 'docs-theme--numior';

export const ACCENT_CLASS_PREFIX = 'nui-theme--accent-';

const isPaletteClass = (name: string): boolean =>
  name === SITE_THEME_CLASS || name.startsWith(ACCENT_CLASS_PREFIX);

const paletteOf = (accent: DocsAccent | undefined): string =>
  accent === undefined ? SITE_THEME_CLASS : `${ACCENT_CLASS_PREFIX}${accent}`;

const applyAccent = (accent: DocsAccent | undefined): void => {
  if (typeof document === 'undefined') {
    return;
  }

  const classes = document.documentElement.classList;
  const wanted = paletteOf(accent);

  for (const name of Array.from(classes).filter(isPaletteClass)) {
    classes.toggle(name, name === wanted);
  }

  classes.add(wanted);
};

export const accentScript = (key: string): string =>
  `(function(){var a=null;try{a=localStorage.getItem(${JSON.stringify(key)})}catch(e){}var c=document.documentElement.classList;if(a&&/^[a-z]+$/.test(a)&&a!==${JSON.stringify(NUMIOR_PALETTE)}){c.add(${JSON.stringify(ACCENT_CLASS_PREFIX)}+a)}else{c.add(${JSON.stringify(SITE_THEME_CLASS)})}})()`;

export const useAccent = createGlobalState((): AccentControl => {
  const choice = useStorage(ACCENT_STORAGE_KEY, NUMIOR_PALETTE, undefined, {
    initOnMounted: true,
  });

  const accent = computed(() => (isAccent(choice.value) ? choice.value : undefined));

  watch(accent, applyAccent, { flush: 'post' });

  return { choice, accent };
});
