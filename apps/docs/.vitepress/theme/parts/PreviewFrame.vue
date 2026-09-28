<template>
  <div
    role="group"
    :aria-label="texts.preview"
    class="rounded-lg border bg-surface bg-dots text-foreground p-8 min-h-40 flex flex-wrap items-center justify-center gap-3"
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
