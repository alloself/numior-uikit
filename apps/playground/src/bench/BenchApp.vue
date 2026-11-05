<template>
  <main class="bench">
    <div class="bench__bar">
      <p class="bench__caption">{{ caption }}</p>
      <NuiInput
        v-model="quick"
        type="search"
        size="sm"
        aria-label="Быстрый фильтр"
        placeholder="Быстрый фильтр"
        data-testid="bench-quick"
      />
    </div>
    <NuiEditor
      v-if="shown && view === 'editor'"
      v-model="document"
      format="json"
      max-height="calc(100dvh - 8rem)"
      label="Бенчмарк редактора"
      data-testid="bench-editor"
    />
    <NuiTree
      v-else-if="shown && view === 'tree'"
      :items="nodes"
      virtual
      height="calc(100dvh - 5rem)"
      label="Бенчмарк дерева"
      data-testid="bench-tree"
    />
    <NuiSpreadsheet
      v-else-if="shown && book"
      :book="book"
      height="calc(100dvh - 5rem)"
      label="Бенчмарк книги"
      data-testid="bench-book"
    />
    <NuiTable
      v-else-if="shown && cells"
      v-bind="cells"
      :column-menu="false"
      bordered
      size="sm"
      height="calc(100dvh - 5rem)"
      label="Бенчмарк листа"
      data-testid="bench-sheet"
    />
    <NuiTable
      v-else-if="shown"
      v-model:sort="sort"
      v-model:filters="filters"
      v-model:quick="quick"
      v-model:group-by="groupBy"
      v-model:expanded="expanded"
      :columns="TABLE_COLUMNS"
      :rows="rows"
      :get-key="(row) => row.id"
      cell-selection
      height="calc(100dvh - 5rem)"
      label="Бенчмарк таблицы"
      data-testid="bench-table"
      @settle="onSettle"
    />
  </main>
</template>

<script setup lang="ts">
import { markRaw, nextTick, onMounted, ref } from 'vue';
import { contentSchema } from '@numior/content';
import { toJSON, type DocJSON } from '@numior/editor-core';
import { generateDoc } from '@numior/editor-core/fixtures';
import { NuiEditor } from '@numior/editor-vue';
import { NuiSpreadsheet } from '@numior/spreadsheet';
import { NuiInput, NuiTree } from '@numior/vue';
import {
  NuiTable,
  tableCells,
  type TableNodeId,
  type TableSort,
  type NuiTableFilters,
} from '@numior/table';
import { TABLE_COLUMNS, generateRows } from '../../../../packages/table/bench/dataset';
import { styledSheet } from '../../../../packages/spreadsheet/bench/fixtures';
import { generateTreeNodes } from '../../../../packages/vue/bench/dataset';
import { bigSheet, SHEET_COLS, SHEET_ROWS } from '../sheet-source';
import {
  afterPaint,
  createFrameRecorder,
  recordSettle,
  trackInput,
  trackKeyLatency,
  type BenchHooks,
  type InputClock,
} from './bench-hooks';

type BenchView = 'table' | 'tree' | 'sheet' | 'book' | 'editor';

const VIEWS: readonly BenchView[] = ['table', 'tree', 'sheet', 'book', 'editor'];

const DEFAULT_ROWS = 1_000_000;

const DEFAULT_BLOCKS = 10_000;

const BOOK_ROWS = 20_000;

const BOOK_COLS = 50;

const isView = (value: string | null): value is BenchView => VIEWS.some((view) => view === value);

const viewOf = (value: string | null): BenchView => (isView(value) ? value : 'table');

const params = new URL(window.location.href).searchParams;
const view = viewOf(params.get('view'));
const requested = Number(params.get('rows'));
const count = Number.isInteger(requested) && requested > 0 ? requested : DEFAULT_ROWS;
const generating = performance.now();
const rows = view === 'table' ? generateRows(count) : [];
const nodes = view === 'tree' ? generateTreeNodes(count) : [];
const cells = view === 'sheet' ? tableCells(bigSheet) : undefined;
const book = view === 'book' ? markRaw(styledSheet(BOOK_ROWS, BOOK_COLS).workbook) : undefined;
const blocks = Number(params.get('blocks'));
const seed = Number(params.get('seed'));

const document = ref<DocJSON | undefined>(
  view === 'editor'
    ? toJSON(
        generateDoc(contentSchema, {
          blocks: Number.isInteger(blocks) && blocks > 0 ? blocks : DEFAULT_BLOCKS,
          seed: Number.isInteger(seed) && seed > 0 ? seed : 1,
        }),
      )
    : undefined,
);

const dataReady = performance.now();
const shown = ref(true);

const blocksShown = (): number => document.value?.root.content?.length ?? 0;

const CAPTIONS: Readonly<Record<BenchView, () => string>> = {
  tree: () => `${count.toLocaleString('ru-RU')} узлов`,
  editor: () => `${blocksShown().toLocaleString('ru-RU')} блоков`,
  sheet: () =>
    `${SHEET_ROWS.toLocaleString('ru-RU')} строк × ${SHEET_COLS.toLocaleString('ru-RU')} колонок`,
  book: () => `книга ${BOOK_ROWS.toLocaleString('ru-RU')} × ${BOOK_COLS} с оформлением`,
  table: () => `${count.toLocaleString('ru-RU')} строк × ${TABLE_COLUMNS.length} колонок`,
};

const caption = CAPTIONS[view]();

const sort = ref<readonly TableSort[]>([]);
const filters = ref<NuiTableFilters>([]);
const quick = ref('');
const groupBy = ref<readonly string[]>([]);
const expanded = ref<readonly TableNodeId[]>([]);
const latencies: number[] = [];
const settles: number[] = [];
const frames: number[] = [];
const clock: InputClock = { last: 0 };

const onSettle = (): void => {
  void recordSettle(settles, clock);
};

const remount = async (): Promise<number> => {
  shown.value = false;
  await nextTick();
  const started = performance.now();
  shown.value = true;
  await nextTick();
  return (await afterPaint()) - started;
};

const ROWS: Readonly<Record<BenchView, () => number>> = {
  tree: () => count,
  editor: blocksShown,
  sheet: () => SHEET_ROWS,
  book: () => BOOK_ROWS,
  table: () => count,
};

const hooks: BenchHooks = {
  rows: ROWS[view](),
  dataMs: dataReady - generating,
  firstRowMs: null,
  latencies,
  settles,
  frames,
  remount,
  recordFrames: createFrameRecorder(frames),
  setGroupBy: (keys) => {
    clock.last = performance.now();
    expanded.value = [];
    groupBy.value = keys;
  },
};

window.numiorBench = hooks;
trackKeyLatency(latencies);
trackInput(clock);

onMounted(async () => {
  hooks.firstRowMs = (await afterPaint()) - dataReady;
});
</script>
