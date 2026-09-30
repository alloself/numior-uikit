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
    <NuiTree
      v-if="shown && view === 'tree'"
      :items="nodes"
      virtual
      height="calc(100dvh - 5rem)"
      label="Бенчмарк дерева"
      data-testid="bench-tree"
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
      height="calc(100dvh - 5rem)"
      label="Бенчмарк таблицы"
      data-testid="bench-table"
      @settle="onSettle"
    />
  </main>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import { NuiInput, NuiTree } from '@numior/vue';
import { NuiTable, type TableNodeId, type TableSort, type NuiTableFilters } from '@numior/table';
import { TABLE_COLUMNS, generateRows } from '../../../../packages/table/bench/dataset';
import { generateTreeNodes } from '../../../../packages/vue/bench/dataset';
import {
  afterPaint,
  createFrameRecorder,
  recordSettle,
  trackInput,
  trackKeyLatency,
  type BenchHooks,
  type InputClock,
} from './bench-hooks';

const DEFAULT_ROWS = 1_000_000;

const params = new URL(window.location.href).searchParams;
const view = params.get('view') === 'tree' ? 'tree' : 'table';
const requested = Number(params.get('rows'));
const count = Number.isInteger(requested) && requested > 0 ? requested : DEFAULT_ROWS;
const generating = performance.now();
const rows = view === 'table' ? generateRows(count) : [];
const nodes = view === 'tree' ? generateTreeNodes(count) : [];
const dataReady = performance.now();
const shown = ref(true);

const caption =
  view === 'tree'
    ? `${count.toLocaleString('ru-RU')} узлов`
    : `${count.toLocaleString('ru-RU')} строк × ${TABLE_COLUMNS.length} колонок`;

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

const hooks: BenchHooks = {
  rows: count,
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
