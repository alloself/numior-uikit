<template>
  <span class="nui-icon" aria-hidden="true">
    <component :is="glyph" v-if="glyph" class="nui-icon__glyph" focusable="false" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useIcons } from '@numior/primitives';
import { defaultIcons } from './default-icons';
import type { NuiIconProps } from './icon.types';

const { alias, icon } = defineProps<NuiIconProps>();
const icons = useIcons();
const glyph = computed(() => {
  if (icon) {
    return icon;
  }
  return alias === undefined ? undefined : (icons[alias] ?? defaultIcons[alias]);
});
</script>
