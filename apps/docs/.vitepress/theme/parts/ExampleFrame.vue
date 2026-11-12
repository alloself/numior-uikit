<template>
  <NuiTabs v-model="view" variant="line" size="sm" class="nui-not-prose my-6">
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <NuiTabList :label="texts.exampleView">
        <NuiTab value="preview" icon="eye">{{ texts.preview }}</NuiTab>
        <NuiTab value="code" icon="code">{{ texts.code }}</NuiTab>
      </NuiTabList>
      <div class="flex items-center gap-1">
        <PreviewOptions v-model:options="options" :texts="texts" />
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
    <NuiTabPanel value="preview" class="mt-3">
      <PreviewFrame :texts="texts" :options="options">
        <component :is="component" />
      </PreviewFrame>
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
import { fileNamed } from '../example-files';
import type { ExampleFrameProps, PreviewOption } from '../theme.types';
import ExampleFiles from './ExampleFiles.vue';
import PreviewFrame from './PreviewFrame.vue';
import PreviewOptions from './PreviewOptions.vue';

const { component, files, texts } = defineProps<ExampleFrameProps>();

const view = ref('preview');
const options = ref<PreviewOption[]>([]);
const fileName = ref(files[0]?.name ?? '');
const clipboard = useClipboard();

const copy = (): void => {
  void clipboard.copy(fileNamed(files, fileName.value).source);
};
</script>
