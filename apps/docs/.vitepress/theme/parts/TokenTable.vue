<template>
  <NuiTable
    :columns="columns"
    :rows="rows"
    :get-key="keyOf"
    :label="texts.tokens"
    :column-menu="false"
    size="sm"
    class="nui-not-prose mb-5"
  >
    <template #cell-sample="{ row }">
      <TokenSampleCell :row="row" />
    </template>
    <template #cell-name="{ row }">
      <code>{{ row.name }}</code>
    </template>
    <template #cell-light="{ row }">
      <code>{{ row.light }}</code>
    </template>
    <template #cell-dark="{ row }">
      <code v-if="row.dark !== undefined">{{ row.dark }}</code>
      <span v-else class="text-subtle-foreground">—</span>
    </template>
  </NuiTable>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NuiTable, type NuiTableColumn } from '@numior/table';
import type { TokenRow, TokenTableProps } from '../theme.types';
import TokenSampleCell from './TokenSampleCell.vue';

const { rows, texts } = defineProps<TokenTableProps>();

const schemed = computed(() => rows.some((row) => row.dark !== undefined));

const textColumn = (
  key: string,
  label: string,
  width: number,
  value: (row: TokenRow) => string,
): NuiTableColumn<TokenRow> => ({
  key,
  label,
  type: 'text',
  filter: false,
  width,
  wrap: true,
  value,
});

const columns = computed<NuiTableColumn<TokenRow>[]>(() => {
  const leading = [
    textColumn('sample', texts.tokenSample, 90, (row) => row.sample),
    textColumn('name', texts.tokenName, 230, (row) => row.name),
  ];

  return schemed.value
    ? [
        ...leading,
        textColumn('light', texts.tokenValue, 200, (row) => row.light),
        textColumn('dark', texts.tokenDark, 200, (row) => row.dark ?? ''),
      ]
    : [...leading, textColumn('light', texts.tokenValue, 400, (row) => row.light)];
});

const keyOf = (row: TokenRow): string => row.name;
</script>
