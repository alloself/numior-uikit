<template>
  <NuiTabs v-model="view" variant="line" size="sm" class="nui-not-prose my-6">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <NuiTabList :label="texts.exampleView">
        <NuiTab value="preview" icon="eye">{{ texts.preview }}</NuiTab>
        <NuiTab value="code" icon="code">{{ texts.code }}</NuiTab>
      </NuiTabList>
      <NuiButton
        variant="ghost"
        tone="neutral"
        size="sm"
        :aria-label="clipboard.copied.value ? texts.copied : texts.copyCode"
        :icon="clipboard.copied.value ? 'check' : 'copy'"
        @click="copy"
      />
    </div>
    <NuiTabPanel value="preview" class="mt-3 grid gap-6 md:grid-cols-2">
      <ThemeFrame :label="texts.baseTheme" :src="src" :height="height" :palette="[]" />
      <ThemeFrame
        :label="texts.siteTheme"
        :src="src"
        :height="height"
        :palette="[SITE_THEME_CLASS]"
      />
    </NuiTabPanel>
    <NuiTabPanel value="code" class="mt-3">
      <ExampleFiles v-model:name="fileName" :files="files" :texts="texts" />
    </NuiTabPanel>
  </NuiTabs>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useClipboard } from '@numior/primitives';
import { NuiButton, NuiTab, NuiTabList, NuiTabPanel, NuiTabs } from '@numior/vue';
import { SITE_THEME_CLASS } from '../composables/use-accent';
import { fileNamed } from '../example-files';
import type { ThemeCompareProps } from '../theme.types';
import ExampleFiles from './ExampleFiles.vue';
import ThemeFrame from './ThemeFrame.vue';

const { src, height, files, texts } = defineProps<ThemeCompareProps>();

const view = ref('preview');
const fileName = ref(files[0]?.name ?? '');
const clipboard = useClipboard();

const copy = (): void => {
  void clipboard.copy(fileNamed(files, fileName.value).source);
};
</script>
