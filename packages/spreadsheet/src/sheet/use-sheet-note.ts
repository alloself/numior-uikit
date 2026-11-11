import { useTimeoutFn } from '@vueuse/core';
import { shallowRef } from 'vue';
import type { SheetNote } from './sheet.types';

const NOTE_MS = 6000;

export const useSheetNote = (): SheetNote => {
  const text = shallowRef('');
  const shown = shallowRef(false);

  const fade = useTimeoutFn(
    () => {
      shown.value = false;
    },
    NOTE_MS,
    { immediate: false },
  );

  return {
    text,
    shown,
    show: (next) => {
      text.value = next;
      shown.value = true;
      fade.start();
    },
    hide: () => {
      fade.stop();
      shown.value = false;
    },
    hold: fade.stop,
    release: () => {
      if (shown.value) {
        fade.start();
      }
    },
  };
};
