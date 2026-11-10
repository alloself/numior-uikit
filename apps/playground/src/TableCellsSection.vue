<template>
  <section class="panel" aria-labelledby="table-cells-title">
    <div class="section-heading">
      <h2 id="table-cells-title">Лист из источника ячеек</h2>
      <span class="tag"
        >tableCells · nextEdge · editable · clipboard · commands · invalidate · overflow · 1 048 576
        × 16 384</span
      >
    </div>
    <div class="data-row">
      <NuiButton
        size="sm"
        variant="outline"
        tone="neutral"
        data-testid="table-cells-toggle"
        @click="toggle"
      >
        {{ cells ? 'Скрыть лист' : 'Показать лист' }}
      </NuiButton>
      <NuiButton
        v-if="cells"
        size="sm"
        variant="outline"
        tone="neutral"
        data-testid="table-cells-recalc"
        @click="recalculate"
      >
        Пересчитать B2:D4
      </NuiButton>
    </div>
    <template v-if="cells">
      <NuiTable
        ref="sheet"
        v-model:ranges="ranges"
        v-bind="cells"
        :column-menu="false"
        bordered
        size="sm"
        height="20rem"
        :clipboard="SHEET_CLIPBOARD"
        :commands="SHEET_COMMANDS"
        label="Лист из источника ячеек"
        data-testid="table-cells"
        @edit="onEdit"
      />
      <pre class="output" data-testid="table-cells-output">{{ output }}</pre>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, useTemplateRef } from 'vue';
import { NuiButton } from '@numior/vue';
import {
  NuiTable,
  columnIndex,
  tableCells,
  type NuiTableCellSource,
  type NuiTableCellValue,
  type NuiTableClipboard,
  type NuiTableCommandSink,
  type NuiTableEdit,
  type NuiTableCells,
  type NuiTableEditEvent,
  type NuiTableExposed,
  type NuiTableRange,
  type NuiTableRanges,
  type NuiTableCellPosition,
} from '@numior/table';
import { bigSheet, SHEET_COLS } from './sheet-source';

const RECALC: NuiTableRange = { from: { row: 1, col: 1 }, to: { row: 3, col: 3 } };

const cells = shallowRef<NuiTableCells>();
const ranges = ref<NuiTableRanges>([]);
const entries = shallowRef<ReadonlyMap<number, string>>(new Map());
const done = shallowRef<readonly NuiTableEditEvent<number>[]>([]);
const undone = shallowRef<readonly NuiTableEditEvent<number>[]>([]);
const sheet = useTemplateRef<NuiTableExposed>('sheet');

const recalculated = new Map<number, string>();
let rounds = 0;

const indexOf = (row: number, col: number): number => row * SHEET_COLS + col;

const editableSheet: NuiTableCellSource = {
  ...bigSheet,
  cellAt: (row, col) => {
    const base = bigSheet.cellAt(row, col);
    const text = entries.value.get(indexOf(row, col)) ?? recalculated.get(indexOf(row, col));

    return text === undefined ? base : { text, style: base?.style };
  },
};

const textAt = (position: NuiTableCellPosition): string =>
  editableSheet.cellAt(position.row, position.col)?.text ?? '';

const recalculateRow = (row: number): void => {
  for (let col = RECALC.from.col; col <= RECALC.to.col; col += 1) {
    recalculated.set(indexOf(row, col), String(rounds * 100 + row * 10 + col));
  }
};

const recalculate = (): void => {
  rounds += 1;

  for (let row = RECALC.from.row; row <= RECALC.to.row; row += 1) {
    recalculateRow(row);
  }
  sheet.value?.invalidate([RECALC]);
};

const SHEET_CLIPBOARD: NuiTableClipboard<number> = {
  serialize: ({ rows, cols }) => ({
    text: rows.map((row) => cols.map((col) => textAt({ row, col })).join(';')).join('\n'),
  }),
  parse: ({ text }) =>
    text.includes(';') && !text.includes('\t')
      ? text.split(/\r?\n/).map((line) => line.split(';'))
      : undefined,
};

const output = computed(() => JSON.stringify({ ranges: ranges.value }));

const textOf = (value: NuiTableCellValue): string => (value === null ? '' : String(value));

const editable = (source: NuiTableCells): NuiTableCells => ({
  ...source,
  columns: source.columns.map((column) => ({ ...column, editable: true })),
});

const toggle = (): void => {
  cells.value = cells.value === undefined ? editable(tableCells(editableSheet)) : undefined;
  ranges.value = [];
};

const writeAll = (changes: readonly NuiTableEdit<number>[], back: boolean): void => {
  const next = new Map(entries.value);

  for (const change of changes) {
    const col = columnIndex(change.key);

    if (col !== undefined) {
      next.set(indexOf(change.row, col), textOf(back ? change.previous : change.value));
    }
  }
  entries.value = next;
};

const onEdit = (event: NuiTableEditEvent<number>): void => {
  writeAll(event.changes, false);
};

const SHEET_COMMANDS: NuiTableCommandSink<number> = {
  push: (command) => {
    done.value = [...done.value, command];
    undone.value = [];
  },
  undo: () => {
    const last = done.value.at(-1);

    if (last === undefined) {
      return 0;
    }
    done.value = done.value.slice(0, -1);
    undone.value = [...undone.value, last];
    writeAll(last.changes, true);
    return last.changes.length;
  },
  redo: () => {
    const next = undone.value.at(-1);

    if (next === undefined) {
      return 0;
    }
    undone.value = undone.value.slice(0, -1);
    done.value = [...done.value, next];
    writeAll(next.changes, false);
    return next.changes.length;
  },
};
</script>
