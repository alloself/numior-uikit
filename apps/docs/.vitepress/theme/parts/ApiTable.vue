<template>
  <div class="flex flex-col gap-2">
    <h4>{{ title }}</h4>
    <NuiTable
      :columns="columns"
      :rows="rows"
      :get-key="keyOf"
      :label="title"
      :column-menu="false"
      size="sm"
    >
      <template #cell-name="{ row }">
        <code>{{ row.name }}</code>
        <span v-if="isRequired(row)" :title="requiredLabel" class="text-error">*</span>
      </template>
      <template #cell-type="{ row }">
        <code>{{ row.type }}</code>
      </template>
      <template #cell-default="{ row }">
        <code v-if="defaultOf(row) !== undefined">{{ defaultOf(row) }}</code>
        <span v-else class="text-subtle-foreground">—</span>
      </template>
      <template #cell-description="{ row }">
        <span v-if="row.description">{{ row.description[locale] }}</span>
        <span v-else class="text-subtle-foreground">—</span>
      </template>
    </NuiTable>
  </div>
</template>

<script setup lang="ts" generic="T extends ApiRow">
import { NuiTable, type NuiTableColumn } from '@numior/table';
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
