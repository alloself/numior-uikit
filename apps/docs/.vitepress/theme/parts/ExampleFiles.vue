<template>
  <NuiTabs
    v-if="files.length > 1"
    v-model="name"
    :tabs="fileTabs"
    :label="texts.exampleFiles"
    size="sm"
  >
    <template #panel="{ tab }">
      <NuiCode
        :code="fileNamed(files, tab.value).source"
        :tokens="fileNamed(files, tab.value).tokens"
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
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NuiCode, NuiTabs } from '@numior/vue';
import { fileNamed } from '../example-files';
import type { ExampleFilesProps } from '../theme.types';

const { files, texts } = defineProps<ExampleFilesProps>();

const name = defineModel<string>('name', { required: true });

const fileTabs = computed(() => files.map((file) => ({ value: file.name, label: file.name })));
const current = computed(() => fileNamed(files, name.value));
</script>
