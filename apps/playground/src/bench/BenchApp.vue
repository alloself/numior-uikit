<template>
  <main class="bench">
    <p class="bench__caption">{{ caption }}</p>
    <NuiDataGrid
      v-if="shown"
      v-model:sort="sort"
      :columns="GRID_COLUMNS"
      :source="rows"
      :get-key="(row) => row.id"
      height="calc(100dvh - 4rem)"
      label="Бенчмарк грида"
      data-testid="bench-grid"
      @settle="onSettle"
    />
  </main>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import { NuiDataGrid, type GridSort } from '@numior/grid';
import { GRID_COLUMNS, generateRows } from '../../../../packages/grid/bench/dataset';
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

const requested = Number(new URL(window.location.href).searchParams.get('rows'));
const count = Number.isInteger(requested) && requested > 0 ? requested : DEFAULT_ROWS;
const generating = performance.now();
const rows = generateRows(count);
const dataReady = performance.now();
const shown = ref(true);
const caption = `${count.toLocaleString('ru-RU')} строк × ${GRID_COLUMNS.length} колонок`;
const sort = ref<readonly GridSort[]>([]);
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
};

window.numiorBench = hooks;
trackKeyLatency(latencies);
trackInput(clock);

onMounted(async () => {
  hooks.firstRowMs = (await afterPaint()) - dataReady;
});
</script>
