<template>
  <span
    class="nui-skeleton"
    :class="[`nui-skeleton--shape-${shape}`, { 'nui-skeleton--static': !animated }]"
    :style="sizing"
    aria-hidden="true"
  >
    <span v-for="line in lineCount" :key="line" class="nui-skeleton__line"></span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { NuiSkeletonProps } from './skeleton.types';

const {
  shape = 'text',
  width,
  height,
  lines = 1,
  animated = true,
} = defineProps<NuiSkeletonProps>();
const lineCount = computed(() => (shape === 'text' ? Math.max(1, lines) : 0));
const sizing = computed(() => ({
  ...(width === undefined ? {} : { '--_inline-size': width }),
  ...(height === undefined ? {} : { '--_block-size': height }),
}));
</script>
