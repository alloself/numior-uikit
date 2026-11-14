<template>
  <NuiTabs v-model="view" variant="line" size="sm" class="nui-not-prose my-6">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <NuiTabList :label="texts.exampleView">
        <NuiTab value="preview" icon="eye">{{ texts.preview }}</NuiTab>
        <NuiTab value="code" icon="code">{{ texts.code }}</NuiTab>
      </NuiTabList>
      <div class="flex items-center gap-1">
        <div class="max-md:hidden">
          <NuiToggleGroup
            v-model="viewport"
            :items="viewports"
            :label="texts.blockViewport"
            size="sm"
            required
            icon-only
          />
        </div>
        <NuiButton
          variant="ghost"
          tone="neutral"
          size="sm"
          icon="external-link"
          :href="src"
          target="_blank"
          :aria-label="texts.blockOpen"
        />
        <NuiButton
          variant="ghost"
          tone="neutral"
          size="sm"
          :aria-label="clipboard.copied.value ? texts.copied : texts.copyCode"
          :icon="clipboard.copied.value ? 'check' : 'copy'"
          @click="copy"
        />
      </div>
    </div>
    <NuiTabPanel value="preview" class="relative mt-3">
      <FrameCorners />
      <div class="overflow-hidden rounded-lg border bg-surface-muted bg-dots">
        <iframe
          ref="frame"
          :src="src"
          :title="`${texts.preview}: ${name}`"
          loading="lazy"
          class="mx-auto block w-full border-0 bg-surface transition-[max-inline-size] duration-(--transition-duration-normal) ease-nui"
          :style="{ maxInlineSize: VIEWPORT_WIDTHS[viewport], blockSize: `${blockSize}px` }"
          @load="syncTheme"
        />
      </div>
    </NuiTabPanel>
    <NuiTabPanel value="code" class="mt-3">
      <ExampleFiles v-model:name="fileName" :files="files" :texts="texts" />
    </NuiTabPanel>
  </NuiTabs>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue';
import { useMutationObserver } from '@vueuse/core';
import { useClipboard } from '@numior/primitives';
import {
  NuiButton,
  NuiTab,
  NuiTabList,
  NuiTabPanel,
  NuiTabs,
  NuiToggleGroup,
  type NuiToggleItem,
} from '@numior/vue';
import { useFramedHeight } from '../block-height';
import { fileNamed } from '../example-files';
import { applyThemeClasses, themeClassesOf } from '../frame-theme';
import { BlockViewport, type BlockFrameProps } from '../theme.types';
import ExampleFiles from './ExampleFiles.vue';
import FrameCorners from './FrameCorners.vue';

const VIEWPORT_WIDTHS: Readonly<Record<BlockViewport, string>> = {
  [BlockViewport.Desktop]: '100%',
  [BlockViewport.Tablet]: '48rem',
  [BlockViewport.Phone]: '24.375rem',
};

const { name, src, height, files, texts } = defineProps<BlockFrameProps>();

const view = ref('preview');
const viewport = ref<BlockViewport>(BlockViewport.Desktop);
const fileName = ref(files[0]?.name ?? '');
const frame = useTemplateRef<HTMLIFrameElement>('frame');
const clipboard = useClipboard();

const blockSize = useFramedHeight(frame, () => height);

const viewports = computed<readonly NuiToggleItem<BlockViewport>[]>(() => [
  { value: BlockViewport.Desktop, label: texts.viewportDesktop, icon: 'monitor' },
  { value: BlockViewport.Tablet, label: texts.viewportTablet, icon: 'tablet' },
  { value: BlockViewport.Phone, label: texts.viewportPhone, icon: 'smartphone' },
]);

const syncTheme = (): void => {
  applyThemeClasses(
    frame.value?.contentDocument?.documentElement,
    themeClassesOf(document.documentElement),
  );
};

const copy = (): void => {
  void clipboard.copy(fileNamed(files, fileName.value).source);
};

useMutationObserver(() => globalThis.document?.documentElement, syncTheme, {
  attributes: true,
  attributeFilter: ['class'],
});

onMounted(syncTheme);
</script>
