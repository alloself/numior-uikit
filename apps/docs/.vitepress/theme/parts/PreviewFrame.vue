<template>
  <div
    role="group"
    :aria-label="texts.preview"
    class="nui-rounded-lg nui-border nui-bg-surface nui-bg-dots nui-text nui-p-8 nui-min-h-40 nui-flex nui-wrap nui-items-center nui-justify-center nui-gap-3"
    :data-nui-theme="frameTheme"
    :dir="frameDirection"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useColorScheme } from '@numior/vue';
import type { PreviewFrameProps } from '../theme.types';

const { texts, options } = defineProps<PreviewFrameProps>();

const scheme = useColorScheme();

const frameTheme = computed(() => {
  if (!options.includes('dark')) {
    return undefined;
  }
  return scheme.resolved.value === 'dark' ? 'light' : 'dark';
});

const frameDirection = computed(() => (options.includes('rtl') ? 'rtl' : undefined));
</script>
