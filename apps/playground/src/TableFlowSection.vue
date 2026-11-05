<template>
  <section class="panel" aria-labelledby="table-flow-title">
    <div class="section-heading">
      <h2 id="table-flow-title">Перетекание текста</h2>
      <span class="tag">tableCells · overflow · merges · frozenRows · pins</span>
    </div>
    <div class="data-row">
      <NuiButton
        size="sm"
        variant="outline"
        tone="neutral"
        data-testid="table-flow-toggle"
        @click="shown = !shown"
      >
        {{ shown ? 'Скрыть лист' : 'Показать лист' }}
      </NuiButton>
    </div>
    <template v-if="shown">
      <div class="data-row">
        <NuiSwitch v-model="frozen" data-testid="table-flow-frozen">Закрепить две строки</NuiSwitch>
        <NuiSwitch v-model="pinned" data-testid="table-flow-pinned">Закрепить колонку A</NuiSwitch>
      </div>
      <NuiTable
        v-model:ranges="ranges"
        v-bind="cells"
        :pins="pinned ? PINS : NO_PINS"
        :merges="MERGES"
        :frozen-rows="frozen ? FROZEN_ROWS : 0"
        :column-menu="false"
        bordered
        size="sm"
        height="22rem"
        label="Перетекание текста"
        data-testid="table-flow"
        @edit="onEdit"
      />
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import { NuiButton, NuiSwitch } from '@numior/vue';
import {
  NuiTable,
  columnIndex,
  columnName,
  tableCells,
  type NuiTableCellSource,
  type NuiTableCells,
  type NuiTableCellStyle,
  type NuiTableEditEvent,
  type NuiTablePins,
  type NuiTableRange,
  type NuiTableRanges,
  type NuiTableSourceCell,
} from '@numior/table';

const ROWS = 14;
const COLS = 30;
const FROZEN_ROWS = 2;
const PINS: NuiTablePins = { A: 'start' };
const NO_PINS: NuiTablePins = {};

const FLOW: NuiTableCellStyle = { overflow: true };
const FLOW_END: NuiTableCellStyle = { overflow: true, align: 'end' };
const FLOW_CENTRE: NuiTableCellStyle = { overflow: true, align: 'center' };

const TITLE: NuiTableCellStyle = {
  overflow: true,
  style: { 'font-weight': '700', 'font-size': '1.25em' },
};

const FILL: NuiTableCellStyle = { fill: 'var(--nui-warning-soft)' };

const EDGE: NuiTableCellStyle = {
  borders: { start: '2px solid var(--nui-error)', top: '2px solid var(--nui-error)' },
};

const LONG = 'Перетекает через пустые ячейки до первой заполненной';

const CELLS: Readonly<Record<string, NuiTableSourceCell>> = {
  A1: { text: 'Сводный отчёт по продажам за первый квартал 2026 года', style: TITLE },
  B2: { text: '█'.repeat(40), style: FLOW },
  B3: { text: LONG, style: FLOW },
  H3: { text: 'Стоп' },
  H4: { text: 'Перетекает влево к началу строки', style: FLOW_END },
  F5: { text: 'Текст по центру расходится в обе стороны', style: FLOW_CENTRE },
  B6: { text: LONG, style: FLOW },
  D6: { text: 'x' },
  B7: { text: LONG, style: FLOW },
  D7: { text: 'Объединено' },
  B8: { text: 'Длинный текст внутри объединения обрезается по его краю', style: FLOW },
  B9: {
    text: 'Очень длинная подпись уходит за окно колонок, а её продолжение остаётся видно в ячейках справа',
    style: FLOW,
  },
  B10: { text: LONG, style: FLOW },
  C10: { text: '', style: FILL },
  D10: { text: '', style: EDGE },
};

const MERGES: readonly NuiTableRange[] = [
  { from: { row: 6, col: 3 }, to: { row: 6, col: 4 } },
  { from: { row: 7, col: 1 }, to: { row: 7, col: 2 } },
];

const nameOf = (row: number, col: number): string => `${columnName(col)}${String(row + 1)}`;

const shown = ref(false);
const frozen = ref(false);
const pinned = ref(false);
const ranges = ref<NuiTableRanges>([]);
const entries = shallowRef<ReadonlyMap<string, string>>(new Map());

const source = computed((): NuiTableCellSource => ({
  rows: ROWS,
  cols: COLS,
  cellAt: (row, col) => {
    const name = nameOf(row, col);
    const base = CELLS[name];
    const text = entries.value.get(name);

    return text === undefined ? base : { text, style: base?.style };
  },
}));

const cells = computed((): NuiTableCells => {
  const sheet = tableCells(source.value);

  return { ...sheet, columns: sheet.columns.map((column) => ({ ...column, editable: true })) };
});

const onEdit = (event: NuiTableEditEvent<number>): void => {
  const next = new Map(entries.value);

  for (const change of event.changes) {
    next.set(nameOf(change.row, columnIndex(change.key)), String(change.value ?? ''));
  }
  entries.value = next;
};
</script>
