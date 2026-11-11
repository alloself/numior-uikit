<template>
  <div
    role="group"
    :aria-label="texts.preview"
    class="rounded-lg border bg-surface bg-dots font-sans text-foreground p-8 min-h-40 flex flex-wrap items-center justify-center gap-3"
    :data-nui-theme="frameTheme"
    :data-nui-accent="frameAccent"
    :dir="frameDirection"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useColorScheme } from '@numior/vue';
import { useAccent } from '../composables/use-accent';
import { DocsAccent, type PreviewFrameProps } from '../theme.types';

const INHERITED_SCHEME = '';

const { texts, options } = defineProps<PreviewFrameProps>();

const scheme = useColorScheme();
const palette = useAccent();

const based = computed(() => options.includes('base'));

const frameTheme = computed(() => {
  if (options.includes('dark')) {
    return scheme.resolved.value === 'dark' ? 'light' : 'dark';
  }
  return based.value ? INHERITED_SCHEME : undefined;
});

const frameAccent = computed(
  () => palette.accent.value ?? (based.value ? DocsAccent.Indigo : undefined),
);

const frameDirection = computed(() => (options.includes('rtl') ? 'rtl' : undefined));
</script>
