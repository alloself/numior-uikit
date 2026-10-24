<template>
  <div
    v-if="table !== undefined"
    class="nui-spreadsheet"
    :dir="table.cells.rightToLeft ? 'rtl' : 'ltr'"
  >
    <NuiTable
      v-bind="table.grid"
      :columns="table.columns"
      :merges="table.cells.merges"
      :frozen-rows="table.cells.frozenRows"
      :row-heights="table.cells.rowHeights"
      :row-height="table.rowHeight"
      :bordered="table.cells.gridlines"
      :height="height"
      :column-menu="false"
      :label="label"
      size="sm"
    />
  </div>
</template>

<script setup lang="ts">
import { useLocale } from '@numior/primitives';
import { NuiTable, tableCells, type NuiTableColumn } from '@numior/table';
import { computed } from 'vue';
import { EN_LOCALE, RU_LOCALE, type BookLocale } from '../core';
import { defaultRowHeight, sheetCells } from './sheet-cells';
import type { NuiSpreadsheetProps } from './sheet.types';

const { book, label, sheet = 0, locale, height = '28rem' } = defineProps<NuiSpreadsheetProps>();

const pinned = (
  columns: readonly NuiTableColumn<number>[],
  count: number,
): NuiTableColumn<number>[] =>
  columns.map((column, index) => (index < count ? { ...column, pin: 'start' } : column));

const kitLocale = useLocale(() => undefined);

const bookLocale = computed(
  (): BookLocale => locale ?? (kitLocale.value.startsWith('ru') ? RU_LOCALE : EN_LOCALE),
);

const table = computed(() => {
  const shown = book.sheets[sheet] ?? book.sheets[0];

  if (shown === undefined) {
    return undefined;
  }

  const cells = sheetCells({ book, sheet: shown, locale: bookLocale.value });
  const { columns, ...grid } = tableCells(cells.source);

  return {
    cells,
    grid,
    columns: pinned(columns, cells.frozenCols),
    rowHeight: defaultRowHeight(shown),
  };
});
</script>
