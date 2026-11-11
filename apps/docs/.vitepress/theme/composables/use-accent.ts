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

const applyAccent = (accent: DocsAccent | undefined): void => {
  if (typeof document === 'undefined') {
    return;
  }

  if (accent === undefined) {
    delete document.documentElement.dataset.nuiAccent;
    return;
  }
  document.documentElement.dataset.nuiAccent = accent;
};

export const accentScript = (key: string): string =>
  `try{var a=localStorage.getItem(${JSON.stringify(key)});if(a&&/^[a-z]+$/.test(a)&&a!==${JSON.stringify(NUMIOR_PALETTE)}){document.documentElement.dataset.nuiAccent=a}}catch(e){}`;

export const useAccent = createGlobalState((): AccentControl => {
  const choice = useStorage(ACCENT_STORAGE_KEY, NUMIOR_PALETTE, undefined, {
    initOnMounted: true,
  });

  const accent = computed(() => (isAccent(choice.value) ? choice.value : undefined));

  watch(accent, applyAccent, { flush: 'post' });

  return { choice, accent };
});
