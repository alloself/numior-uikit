<template>
  <div :ref="setBox" :style="{ '--transition-duration-normal': duration, '--ease-nui': 'linear' }">
    <p v-for="row in rows" :key="row">Row {{ row }}</p>
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue';
import { useBlockSizeTween } from '../../src';

const ROW_HEIGHT = 40;

const { rows, duration } = defineProps<{
  rows: number;
  duration: string;
}>();

const emit = defineEmits<{
  tween: [keyframes: unknown, options: unknown];
}>();

const box = shallowRef<HTMLElement | null>(null);

const setBox = (element: unknown): void => {
  if (!(element instanceof HTMLElement)) {
    box.value = null;
    return;
  }

  element.getBoundingClientRect = () =>
    new DOMRect(0, 0, 200, element.children.length * ROW_HEIGHT);

  Object.defineProperty(element, 'animate', {
    configurable: true,
    value: (keyframes: unknown, options: unknown) => {
      emit('tween', keyframes, options);
    },
  });

  box.value = element;
};

useBlockSizeTween(box);
</script>
