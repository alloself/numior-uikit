<template>
  <span
    ref="root"
    class="nui-skeleton"
    :class="[`nui-skeleton--shape-${shape}`, { 'nui-skeleton--static': !animated }]"
    :style="sizing"
    aria-hidden="true"
  >
    <span v-for="line in lineCount" :key="line" class="nui-skeleton__line"></span>
  </span>
</template>

<script setup lang="ts">
import { computed, onMounted, useTemplateRef, watch } from 'vue';
import { NuiSkeletonShape, type NuiSkeletonProps } from './skeleton.types';

const {
  shape = NuiSkeletonShape.Text,
  width,
  height,
  lines = 1,
  animated = true,
} = defineProps<NuiSkeletonProps>();

const root = useTemplateRef<HTMLElement>('root');

const lineCount = computed(() => (shape === NuiSkeletonShape.Text ? Math.max(1, lines) : 0));

const sizing = computed(() => ({
  ...(width === undefined ? {} : { '--_inline-size': width }),
  ...(height === undefined ? {} : { '--_block-size': height }),
}));

const syncAnimations = (): void => {
  const element = root.value;

  if (element === null || !('getAnimations' in element)) {
    return;
  }

  element.getAnimations({ subtree: true }).forEach((animation) => {
    animation.startTime = 0;
  });
};

onMounted(syncAnimations);

watch(lineCount, syncAnimations, { flush: 'post' });
</script>
