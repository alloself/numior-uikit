<template>
  <div
    v-if="table !== undefined"
    class="nui-spreadsheet"
    :dir="table.cells.rightToLeft ? 'rtl' : 'ltr'"
  >
    <NuiTable
      ref="grid"
      v-bind="table.grid"
      :draft="editing.draft.value"
      :columns="table.columns"
      :merges="table.cells.merges"
      :frozen-rows="table.cells.frozenRows"
      :row-heights="table.cells.rowHeights"
      :row-height="table.rowHeight"
      :bordered="table.cells.gridlines"
      :height="height"
      :column-menu="false"
      :commands="editing.commands"
      :label="label"
      size="sm"
      @update:draft="editing.setDraft"
    />
  </div>
</template>

<script setup lang="ts">
import { useLocale, useMessages } from '@numior/primitives';
import { NuiTable, tableCells, type NuiTableColumn, type NuiTableExposed } from '@numior/table';
import { computed, useTemplateRef } from 'vue';
import { EN_LOCALE, RU_LOCALE, createCalculator, type BookLocale } from '../core';
import { defaultRowHeight, sheetCells } from './sheet-cells';
import type { NuiSpreadsheetChange, NuiSpreadsheetProps } from './sheet.types';
import { spreadsheetMessages } from './spreadsheet.messages';
import { useSheetEditing } from './use-sheet-editing';

const {
  book,
  calculator,
  label,
  sheet = 0,
  locale,
  height = '28rem',
  readonly = false,
} = defineProps<NuiSpreadsheetProps>();

const emit = defineEmits<{
  change: [change: NuiSpreadsheetChange];
}>();

const grid = useTemplateRef<NuiTableExposed>('grid');

const kitLocale = useLocale(() => undefined);

const messages = useMessages(spreadsheetMessages);

const bookLocale = computed(
  (): BookLocale => locale ?? (kitLocale.value.startsWith('ru') ? RU_LOCALE : EN_LOCALE),
);

const shownSheet = computed(() => book.sheets[sheet] ?? book.sheets[0]);

const ownCalculator = computed(() => createCalculator(book, { locale: bookLocale.value }));

const cells = computed(() =>
  shownSheet.value === undefined
    ? undefined
    : sheetCells({ book, sheet: shownSheet.value, locale: bookLocale.value }),
);

const editing = useSheetEditing({
  book: () => book,
  calculator: () => calculator ?? ownCalculator.value,
  sheet: () => shownSheet.value,
  cells: () => cells.value,
  locale: () => bookLocale.value,
  readonly: () => readonly,
  messages,
  table: grid,
  changed: (change) => {
    emit('change', change);
  },
});

const pinned = (
  columns: readonly NuiTableColumn<number>[],
  count: number,
): NuiTableColumn<number>[] =>
  columns.map((column, index) => (index < count ? { ...column, pin: 'start' } : column));

const table = computed(() => {
  const shown = shownSheet.value;
  const current = cells.value;

  if (shown === undefined || current === undefined) {
    return undefined;
  }

  const { columns, ...rest } = tableCells(current.source);

  return {
    cells: current,
    grid: rest,
    columns: editing.editableColumns(pinned(columns, current.frozenCols)),
    rowHeight: defaultRowHeight(shown),
  };
});
</script>
