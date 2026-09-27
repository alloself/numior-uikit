<template>
  <div class="nui-flex nui-flex-col nui-gap-2">
    <h4>{{ title }}</h4>
    <NuiTable :columns="columns" :rows="rows" :get-key="keyOf" size="sm">
      <template #cell-name="{ row }">
        <code>{{ row.name }}</code>
        <NuiBadge v-if="isRequired(row)" variant="soft" tone="warning" size="sm" class="nui-ms-2">
          {{ requiredLabel }}
        </NuiBadge>
      </template>
      <template #cell-type="{ row }">
        <code>{{ row.type }}</code>
      </template>
      <template #cell-default="{ row }">
        <code v-if="defaultOf(row) !== undefined">{{ defaultOf(row) }}</code>
        <span v-else class="nui-text-subtle">—</span>
      </template>
      <template #cell-description="{ row }">
        <span v-if="row.description">{{ row.description[locale] }}</span>
        <span v-else class="nui-text-subtle">—</span>
      </template>
    </NuiTable>
  </div>
</template>

<script setup lang="ts" generic="T extends ApiRow">
import { NuiBadge, NuiTable, type NuiTableColumn } from '@numior/vue';
import type { ExampleLocale } from '../../examples/example.types';
import type { ApiRow } from '../theme.types';

interface ApiTableProps {
  title: string;
  columns: readonly NuiTableColumn<T>[];
  rows: readonly T[];
  locale: ExampleLocale;
  requiredLabel?: string | undefined;
}

const { title, columns, rows, locale, requiredLabel } = defineProps<ApiTableProps>();

const keyOf = (row: ApiRow): string => row.name;
const isRequired = (row: ApiRow): boolean => row.required === true && requiredLabel !== undefined;
const defaultOf = (row: ApiRow): string | undefined => row.default;
</script>
