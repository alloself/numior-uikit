<template>
  <span class="nui-icon" :style="transformStyle" aria-hidden="true">
    <component :is="glyph" v-if="glyph" class="nui-icon__glyph" focusable="false" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useIcons } from '@numior/primitives';
import { defaultIcons } from './default-icons';
import type { NuiIconProps } from './icon.types';

const { alias, icon, transform } = defineProps<NuiIconProps>();
const icons = useIcons();

const transformStyle = computed(() =>
  transform === undefined
    ? undefined
    : {
        '--_rotate': transform.rotate === undefined ? undefined : `${String(transform.rotate)}deg`,
        '--_scale': transform.scale === undefined ? undefined : String(transform.scale),
      },
);

const glyph = computed(() => {
  if (icon) {
    return icon;
  }
  return alias === undefined ? undefined : (icons[alias] ?? defaultIcons[alias]);
});
</script>
