<template>
  <div class="nui-not-prose my-4">
    <NuiTable
      :columns="columns"
      :rows="keys"
      :get-key="keyOf"
      :label="texts.apiKeyboard"
      :column-menu="false"
      size="sm"
    >
      <template #cell-keys="{ row }">
        <NuiKbd :keys="row.keys" size="sm" />
      </template>
      <template #cell-description="{ row }">{{ row.description[locale] }}</template>
    </NuiTable>
  </div>
</template>

<script setup lang="ts">
import { NuiKbd } from '@numior/vue';
import { NuiTable, type NuiTableColumn } from '@numior/table';
import type { ReferenceKey } from '../../reference/reference.types';
import type { ApiKeyboardProps } from '../theme.types';

const { keys, locale, texts } = defineProps<ApiKeyboardProps>();

const keyOf = (row: ReferenceKey): string => row.keys;

const columns: readonly NuiTableColumn<ReferenceKey>[] = [
  {
    key: 'keys',
    label: texts.apiKeys,
    type: 'text',
    filter: false,
    width: 160,
    wrap: true,
    value: (row) => row.keys,
  },
  {
    key: 'description',
    label: texts.apiAction,
    type: 'text',
    filter: false,
    width: 200,
    flex: 1,
    wrap: true,
    value: (row) => row.description[locale],
  },
];
</script>
