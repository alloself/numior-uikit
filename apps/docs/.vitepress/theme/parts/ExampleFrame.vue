<template>
  <div class="nui-not-prose nui-my-6 nui-flex nui-flex-col nui-gap-2">
    <div class="nui-flex nui-items-center nui-justify-between nui-gap-2 nui-wrap">
      <NuiToggleGroup
        v-model="view"
        :items="views"
        :label="texts.exampleView"
        variant="segmented"
        size="sm"
        required
      />
      <div class="nui-flex nui-items-center nui-gap-1">
        <NuiToggleGroup
          v-model:values="options"
          :items="optionItems"
          :label="texts.exampleOptions"
          size="sm"
          multiple
          icon-only
        />
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
    <div
      v-show="view === 'preview'"
      role="group"
      :aria-label="texts.preview"
      class="nui-rounded-lg nui-border nui-bg-surface nui-text nui-p-6 nui-flex nui-wrap nui-items-center nui-gap-3"
      :data-nui-theme="frameTheme"
      :dir="frameDirection"
    >
      <component :is="component" />
    </div>
    <div v-show="view === 'code'">
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
            :language="fileNamed(tab.value).language"
            :max-lines="30"
            :copyable="false"
          />
        </template>
      </NuiTabs>
      <NuiCode
        v-else
        :code="current.source"
        :tokens="current.tokens"
        :language="current.language"
        :max-lines="30"
        :copyable="false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useClipboard } from '@numior/primitives';
import {
  NuiButton,
  NuiCode,
  NuiIcon,
  NuiTabs,
  NuiToggleGroup,
  useColorScheme,
  type NuiToggleItem,
} from '@numior/vue';
import type { ExampleFile } from '../../examples/example.types';
import type { ExampleFrameProps } from '../theme.types';

type ExampleView = 'preview' | 'code';
type ExampleOption = 'dark' | 'rtl';

const EMPTY_FILE: ExampleFile = { name: '', language: undefined, source: '', tokens: undefined };

const { component, files, texts } = defineProps<ExampleFrameProps>();

const view = ref<ExampleView | null>('preview');
const options = ref<ExampleOption[]>([]);
const fileName = ref(files[0]?.name ?? '');
const scheme = useColorScheme();
const clipboard = useClipboard();

const views = computed<readonly NuiToggleItem<ExampleView>[]>(() => [
  { value: 'preview', label: texts.preview, icon: 'eye' },
  { value: 'code', label: texts.code, icon: 'code' },
]);

const optionItems = computed<readonly NuiToggleItem<ExampleOption>[]>(() => [
  { value: 'dark', label: texts.invertTheme, icon: 'moon' },
  { value: 'rtl', label: texts.rtl, icon: 'direction' },
]);

const fileTabs = computed(() => files.map((file) => ({ value: file.name, label: file.name })));

const fileNamed = (name: string): ExampleFile =>
  files.find((file) => file.name === name) ?? files[0] ?? EMPTY_FILE;

const current = computed(() => fileNamed(fileName.value));

const frameTheme = computed(() => {
  if (!options.value.includes('dark')) {
    return undefined;
  }
  return scheme.resolved.value === 'dark' ? 'light' : 'dark';
});

const frameDirection = computed(() => (options.value.includes('rtl') ? 'rtl' : undefined));

const copy = (): void => {
  void clipboard.copy(current.value.source);
};
</script>
