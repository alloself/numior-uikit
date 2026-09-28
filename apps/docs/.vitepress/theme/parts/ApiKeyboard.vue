<template>
  <div class="nui-not-prose my-4">
    <NuiTable :columns="columns" :rows="keys" :get-key="keyOf" size="sm">
      <template #cell-keys="{ row }">
        <NuiKbd :keys="row.keys" size="sm" />
      </template>
      <template #cell-description="{ row }">{{ row.description[locale] }}</template>
    </NuiTable>
  </div>
</template>

<script setup lang="ts">
import { NuiKbd, NuiTable, type NuiTableColumn } from '@numior/vue';
import type { ReferenceKey } from '../../reference/reference.types';
import type { ApiKeyboardProps } from '../theme.types';

const { keys, locale, texts } = defineProps<ApiKeyboardProps>();

const keyOf = (row: ReferenceKey): string => row.keys;

const columns: readonly NuiTableColumn<ReferenceKey>[] = [
  { key: 'keys', label: texts.apiKeys },
  { key: 'description', label: texts.apiAction },
];
</script>
