<template>
  <span
    ref="root"
    class="nui-icon"
    :class="{ 'nui-icon--filled': filled }"
    :style="transformStyle"
    aria-hidden="true"
  >
    <component :is="glyph" v-if="glyph" class="nui-icon__glyph" focusable="false" />
  </span>
</template>

<script setup lang="ts">
import { iconPending } from '@numior/primitives';
import { useEventListener } from '@vueuse/core';
import { computed, onMounted, useTemplateRef } from 'vue';
import { useIcon } from './use-icon';
import type { NuiIconProps } from './icon.types';

const APPEARING = 'nui-icon--appearing';
const APPEARED = ['animationend', 'animationcancel'];

const { icon, transform, filled } = defineProps<NuiIconProps>();

const transformStyle = computed(() =>
  transform === undefined
    ? undefined
    : {
        '--_rotate': transform.rotate === undefined ? undefined : `${String(transform.rotate)}deg`,
        '--_scale': transform.scale === undefined ? undefined : String(transform.scale),
      },
);

const root = useTemplateRef<HTMLElement>('root');
const glyph = useIcon(() => icon);

onMounted(() => {
  const element = root.value;

  if (element === null || !iconPending(glyph.value)) {
    return;
  }

  element.classList.add(APPEARING);

  const stop = useEventListener(element, APPEARED, (event) => {
    if (event.target === element) {
      return;
    }

    element.classList.remove(APPEARING);
    stop();
  });
});
</script>
