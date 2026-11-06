<template>
  <div
    v-if="table !== undefined"
    ref="root"
    class="nui-spreadsheet"
    :dir="table.cells.rightToLeft ? 'rtl' : 'ltr'"
  >
    <div
      v-if="formulaBar"
      ref="bar"
      class="nui-spreadsheet__bar"
      :class="{ 'nui-spreadsheet__bar--expanded': formula.expanded.value }"
    >
      <input
        ref="nameField"
        class="nui-spreadsheet__name"
        :class="{ 'nui-spreadsheet__name--invalid': formula.nameInvalid.value }"
        :value="formula.nameText.value"
        :aria-label="messages.nameBox"
        :aria-invalid="formula.nameInvalid.value"
        autocomplete="off"
        spellcheck="false"
        @focus="formula.onNameFocus"
        @input="formula.onNameInput"
        @keydown="formula.onNameKeydown"
        @blur="formula.onNameBlur"
      />
      <span class="nui-spreadsheet__fx" aria-hidden="true"></span>
      <textarea
        :id="formulaId"
        ref="formulaField"
        class="nui-spreadsheet__formula"
        :value="formula.formulaText.value"
        :readonly="readonly"
        :aria-label="messages.formulaBar"
        rows="1"
        dir="auto"
        autocomplete="off"
        spellcheck="false"
        @focus="formula.onFormulaFocus"
        @input="formula.onFormulaInput"
        @keydown="formula.onFormulaKeydown"
        @blur="formula.onFormulaBlur"
      ></textarea>
      <span class="nui-spreadsheet__expand">
        <NuiButton
          variant="ghost"
          tone="neutral"
          size="xs"
          icon-only
          :aria-label="messages.expandFormula"
          :aria-expanded="formula.expanded.value"
          :aria-controls="formulaId"
          @click="formula.toggle"
        >
          <NuiIcon icon="chevron-down" :transform="{ rotate: formula.expanded.value ? 180 : 0 }" />
        </NuiButton>
      </span>
    </div>
    <NuiTable
      ref="grid"
      v-model:active="formula.active.value"
      v-model:ranges="formula.ranges.value"
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
      :keep-editing="formula.keepEditing"
      :label="label"
      size="sm"
      @update:draft="editing.setDraft"
    />
    <div class="nui-spreadsheet__hidden" role="status" aria-live="polite">
      {{ formula.announcement.value }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLocale, useMessages } from '@numior/primitives';
import { NuiTable, tableCells, type NuiTableColumn, type NuiTableExposed } from '@numior/table';
import { NuiButton, NuiIcon } from '@numior/vue';
import { computed, useId, useTemplateRef } from 'vue';
import { EN_LOCALE, RU_LOCALE, createCalculator, type BookLocale } from '../core';
import { defaultRowHeight, sheetCells } from './sheet-cells';
import type { NuiSpreadsheetChange, NuiSpreadsheetProps } from './sheet.types';
import { spreadsheetMessages } from './spreadsheet.messages';
import { useFormulaBar } from './use-formula-bar';
import { useSheetEditing } from './use-sheet-editing';

const {
  book,
  calculator,
  label,
  sheet = 0,
  locale,
  height = '28rem',
  readonly = false,
  formulaBar = true,
} = defineProps<NuiSpreadsheetProps>();

const emit = defineEmits<{
  change: [change: NuiSpreadsheetChange];
}>();

const root = useTemplateRef<HTMLElement>('root');
const bar = useTemplateRef<HTMLElement>('bar');
const nameField = useTemplateRef<HTMLInputElement>('nameField');
const formulaField = useTemplateRef<HTMLTextAreaElement>('formulaField');
const grid = useTemplateRef<NuiTableExposed>('grid');

const formulaId = useId();

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

const formula = useFormulaBar({
  book: () => book,
  sheet: () => shownSheet.value,
  cells: () => cells.value,
  readonly: () => readonly,
  messages,
  editing,
  table: grid,
  root,
  bar,
  nameField,
  formulaField,
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
