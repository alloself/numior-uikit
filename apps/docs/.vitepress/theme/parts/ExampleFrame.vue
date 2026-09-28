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
          @click="copy"
        >
          <NuiIcon :alias="clipboard.copied.value ? 'check' : 'copy'" />
        </NuiButton>
      </div>
    </div>
    <NuiTabPanel value="preview" class="mt-2">
      <PreviewFrame :texts="texts" :options="options">
        <component :is="component" />
      </PreviewFrame>
    </NuiTabPanel>
    <NuiTabPanel value="code" class="mt-2">
      <NuiTabs
        v-if="files.length > 1"
        v-model="fileName"
        :tabs="fileTabs"
        :label="texts.exampleFiles"
        size="sm"
      >
        <template #panel="{ tab }">
          <NuiCode
            :code="fileNamed(tab.value).source"
            :tokens="fileNamed(tab.value).tokens"
            :max-lines="30"
            :copyable="false"
          />
        </template>
      </NuiTabs>
      <NuiCode
        v-else
        :code="current.source"
        :tokens="current.tokens"
        :max-lines="30"
        :copyable="false"
      />
    </NuiTabPanel>
  </NuiTabs>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useClipboard } from '@numior/primitives';
import { NuiButton, NuiCode, NuiIcon, NuiTab, NuiTabList, NuiTabPanel, NuiTabs } from '@numior/vue';
import type { ExampleFile } from '../../examples/example.types';
import type { ExampleFrameProps, PreviewOption } from '../theme.types';
import PreviewFrame from './PreviewFrame.vue';
import PreviewOptions from './PreviewOptions.vue';

const EMPTY_FILE: ExampleFile = { name: '', language: undefined, source: '', tokens: undefined };

const { component, files, texts } = defineProps<ExampleFrameProps>();

const view = ref('preview');
const options = ref<PreviewOption[]>([]);
const fileName = ref(files[0]?.name ?? '');
const clipboard = useClipboard();

const fileTabs = computed(() => files.map((file) => ({ value: file.name, label: file.name })));

const fileNamed = (name: string): ExampleFile =>
  files.find((file) => file.name === name) ?? files[0] ?? EMPTY_FILE;

const current = computed(() => fileNamed(fileName.value));

const copy = (): void => {
  void clipboard.copy(current.value.source);
};
</script>
