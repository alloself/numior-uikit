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
      <span v-if="narrow" class="flex flex-col items-start gap-1">
        <code>{{ row.name }}</code>
        <TokenValueCell :row="row" :texts="texts" />
        <span v-if="row.dark !== undefined" class="text-subtle-foreground">
          {{ texts.tokenDark }}: <code class="wrap-anywhere">{{ row.dark }}</code>
        </span>
        <template v-if="row.lineHeight !== undefined">
          <code>{{ row.lineHeight.name }}</code>
          <code>{{ row.lineHeight.value }}</code>
        </template>
      </span>
      <span v-else class="flex flex-col items-start gap-1">
        <code>{{ row.name }}</code>
        <code v-if="row.lineHeight !== undefined">{{ row.lineHeight.name }}</code>
      </span>
    </template>
    <template #cell-light="{ row }">
      <span class="flex flex-col items-start gap-1">
        <TokenValueCell :row="row" :texts="texts" />
        <code v-if="row.lineHeight !== undefined">{{ row.lineHeight.value }}</code>
      </span>
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
import { useMediaQuery } from '@numior/vue';
import type { TokenRow, TokenTableProps } from '../theme.types';
import TokenSampleCell from './TokenSampleCell.vue';
import TokenValueCell from './TokenValueCell.vue';

const NARROW_QUERY = '(max-width: 40rem)';

const { rows, texts } = defineProps<TokenTableProps>();

const narrow = useMediaQuery(NARROW_QUERY);

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
  if (narrow.value) {
    return [
      textColumn('sample', texts.tokenSample, 84, (row) => row.sample),
      { ...textColumn('name', texts.tokenName, 220, (row) => row.name), flex: 1 },
    ];
  }

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
