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
        <InlineText v-if="row.description" :text="row.description[locale]" />
        <span v-else class="text-subtle-foreground">—</span>
      </template>
    </NuiTable>
  </div>
</template>

<script setup lang="ts" generic="T extends ApiRow">
import { NuiTable } from '@numior/table';
import type { ApiRow, ApiTableProps } from '../theme.types';
import InlineText from './InlineText.vue';

const { title, columns, rows, locale, requiredLabel } = defineProps<ApiTableProps<T>>();

const keyOf = (row: ApiRow): string => row.name;
const isRequired = (row: ApiRow): boolean => row.required === true && requiredLabel !== undefined;
const defaultOf = (row: ApiRow): string | undefined => row.default;
</script>
