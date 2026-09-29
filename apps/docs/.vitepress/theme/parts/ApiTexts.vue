<template>
  <div class="flex flex-col gap-2">
    <h4>{{ texts.apiTexts }}</h4>
    <NuiTable
      :columns="columns"
      :rows="rows"
      :get-key="keyOf"
      :label="texts.apiTexts"
      :column-menu="false"
      size="sm"
    >
      <template #cell-key="{ row }">
        <code>{{ row.key }}</code>
      </template>
    </NuiTable>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NuiTable, type NuiTableColumn } from '@numior/table';
import type { ApiTextsProps } from '../theme.types';

interface TextRow {
  readonly key: string;
  readonly ru: string;
  readonly en: string;
}

const { catalog, texts } = defineProps<ApiTextsProps>();

const keyOf = (row: TextRow): string => row.key;

const columns: readonly NuiTableColumn<TextRow>[] = [
  {
    key: 'key',
    label: texts.apiKey,
    type: 'text',
    filter: false,
    width: 160,
    value: (row) => row.key,
  },
  {
    key: 'ru',
    label: texts.apiRussian,
    type: 'text',
    filter: false,
    width: 200,
    flex: 1,
    wrap: true,
    value: (row) => row.ru,
  },
  {
    key: 'en',
    label: texts.apiEnglish,
    type: 'text',
    filter: false,
    width: 200,
    flex: 1,
    wrap: true,
    value: (row) => row.en,
  },
];

const rows = computed<TextRow[]>(() =>
  Object.entries(catalog.texts).map(([key, text]) => ({ key, ru: text.ru, en: text.en })),
);
</script>
