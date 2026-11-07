import { useIntersectionObserver } from '@vueuse/core';
import { computed } from 'vue';
import type { Ref } from 'vue';

const panelsOf = (root: HTMLElement | null): HTMLElement[] =>
  Array.from(root?.children ?? []).reduce<HTMLElement[]>((panels, child) => {
    if (child instanceof HTMLElement && child.classList.contains('panel')) {
      panels.push(child);
    }
    return panels;
  }, []);

const mark = (entries: IntersectionObserverEntry[]): void => {
  entries.forEach((entry) => {
    entry.target.classList.toggle('panel--away', !entry.isIntersecting);
  });
};

export const usePausedAway = (root: Readonly<Ref<HTMLElement | null>>): void => {
  const panels = computed(() => panelsOf(root.value));

  useIntersectionObserver(panels, mark, { rootMargin: '25% 0px' });
};
