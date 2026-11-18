<template>
  <figure class="nui-not-prose relative m-0 mb-5 min-w-0" :aria-label="texts.themePreview">
    <FrameCorners />
    <div class="overflow-hidden rounded-lg border">
      <div
        class="flex justify-center bg-surface p-4 font-sans text-foreground sm:p-6"
        :style="style"
      >
        <component :is="example.component" />
      </div>
    </div>
  </figure>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { loadExample } from '../examples';
import { themeModel } from '../theme-sources';
import type { ThemeStepViewProps } from '../theme.types';
import FrameCorners from './FrameCorners.vue';

const { theme, locale, texts } = defineProps<ThemeStepViewProps>();

const example = await loadExample(locale, 'guide/Theme');

const style = computed(() => themeModel.previewOf(new Map(Object.entries(theme))));
</script>
