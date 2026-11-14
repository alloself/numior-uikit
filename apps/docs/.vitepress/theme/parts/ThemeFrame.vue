<template>
  <figure class="m-0 flex min-w-0 flex-col gap-3">
    <figcaption>
      <DocsCaption>{{ label }}</DocsCaption>
    </figcaption>
    <div class="relative">
      <FrameCorners />
      <div class="overflow-hidden rounded-lg border bg-surface">
        <iframe
          ref="frame"
          :src="src"
          :title="label"
          loading="lazy"
          class="block w-full border-0 bg-surface"
          :style="{ blockSize: `${blockSize}px` }"
          @load="syncTheme"
        />
      </div>
    </div>
  </figure>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useMutationObserver } from '@vueuse/core';
import { useFramedHeight } from '../block-height';
import { applyThemeClasses, schemeClassesOf } from '../frame-theme';
import type { ThemeFrameProps } from '../theme.types';
import DocsCaption from './DocsCaption.vue';
import FrameCorners from './FrameCorners.vue';

const { label, src, height, palette } = defineProps<ThemeFrameProps>();

const frame = useTemplateRef<HTMLIFrameElement>('frame');

const blockSize = useFramedHeight(frame, () => height);

const syncTheme = (): void => {
  applyThemeClasses(frame.value?.contentDocument?.documentElement, [
    ...schemeClassesOf(document.documentElement),
    ...palette,
  ]);
};

useMutationObserver(() => globalThis.document?.documentElement, syncTheme, {
  attributes: true,
  attributeFilter: ['class'],
});
</script>
