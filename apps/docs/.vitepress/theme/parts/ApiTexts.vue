<template>
  <div class="nui-flex nui-flex-col nui-gap-2">
    <h4>{{ texts.apiTexts }}</h4>
    <NuiTable :columns="columns" :rows="rows" :get-key="keyOf" size="sm">
      <template #cell-key="{ row }">
        <code>{{ row.key }}</code>
      </template>
    </NuiTable>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NuiTable, type NuiTableColumn } from '@numior/vue';
import type { ApiTextsProps } from '../theme.types';

interface TextRow {
  readonly key: string;
  readonly ru: string;
  readonly en: string;
}

const { catalog, texts } = defineProps<ApiTextsProps>();

const keyOf = (row: TextRow): string => row.key;

const columns: readonly NuiTableColumn<TextRow>[] = [
  { key: 'key', label: texts.apiKey },
  { key: 'ru', label: texts.apiRussian },
  { key: 'en', label: texts.apiEnglish },
];

const rows = computed<TextRow[]>(() =>
  Object.entries(catalog.texts).map(([key, text]) => ({ key, ru: text.ru, en: text.en })),
);
</script>
