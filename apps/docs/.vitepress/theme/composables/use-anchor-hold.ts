import { useEventListener, useResizeObserver, useTimeoutFn } from '@vueuse/core';
import { useRoute } from 'vitepress';
import { onMounted, shallowRef, watch } from 'vue';

const QUIET_MS = 1500;

const INTENT_EVENTS: (keyof WindowEventMap)[] = ['wheel', 'touchstart', 'keydown', 'pointerdown'];

const idOf = (hash: string): string => {
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return '';
  }
};

const anchorOf = (hash: string): HTMLElement | null => {
  const id = idOf(hash);

  return id === '' ? null : document.getElementById(id);
};

export const useAnchorHold = (): void => {
  const route = useRoute();
  const held = shallowRef<HTMLElement | null>(null);

  const release = useTimeoutFn(
    () => {
      held.value = null;
    },
    QUIET_MS,
    { immediate: false },
  );

  const hold = (): void => {
    held.value = anchorOf(route.hash);
    release.start();
  };

  const keep = (): void => {
    if (held.value === null) {
      return;
    }
    held.value.scrollIntoView({ block: 'start', behavior: 'instant' });
    release.start();
  };

  const letGo = (): void => {
    held.value = null;
  };

  useEventListener(INTENT_EVENTS, letGo, { capture: true, passive: true });
  useResizeObserver(() => (held.value === null ? null : document.body), keep);
  watch(() => `${route.path}${route.hash}`, hold, { flush: 'post' });
  onMounted(hold);
};
