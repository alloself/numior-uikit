<template>
  <div
    role="group"
    :aria-label="texts.preview"
    class="rounded-lg border bg-surface bg-dots font-sans text-foreground p-8 min-h-40 flex flex-wrap items-center justify-center gap-3"
    :class="frameTheme"
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
  return scheme.resolved.value === 'dark' ? 'nui-theme--light' : 'nui-theme--dark';
});

const frameDirection = computed(() => (options.includes('rtl') ? 'rtl' : undefined));
</script>
