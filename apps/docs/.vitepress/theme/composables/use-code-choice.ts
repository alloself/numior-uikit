import type { Ref } from 'vue';
import { createGlobalState, useStorage } from '@vueuse/core';

export interface CodeChoice {
  readonly recent: Ref<string[]>;
  choose(label: string): void;
  chosen(labels: readonly string[]): string;
}

export const CODE_CHOICE_STORAGE_KEY = 'nui-code-choice';

const RECENT_LIMIT = 12;

export const useCodeChoice = createGlobalState((): CodeChoice => {
  const recent = useStorage<string[]>(CODE_CHOICE_STORAGE_KEY, [], undefined, {
    initOnMounted: true,
  });

  return {
    recent,
    choose: (label) => {
      recent.value = [label, ...recent.value.filter((entry) => entry !== label)].slice(
        0,
        RECENT_LIMIT,
      );
    },
    chosen: (labels) => recent.value.find((entry) => labels.includes(entry)) ?? labels[0] ?? '',
  };
});
