<template>
  <div class="flex flex-col gap-3">
    <NuiTable
      cell-selection
      v-model:ranges="ranges"
      v-model:row-heights="rowHeights"
      :columns="columns"
      :rows="readings"
      :get-key="keyOf"
      :row-headers="ROW_HEADERS"
      gridlines
      height="18rem"
      :column-menu="false"
      caption="Sensor readings, °C"
    />
    <p class="text-sm text-muted-foreground">Selected cells: {{ selectedCells }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  NuiTable,
  type NuiTableColumn,
  type NuiTableRanges,
  type NuiTableRowHeights,
} from '@numior/table';

interface Reading {
  readonly hour: number;
  readonly values: readonly number[];
}

const SENSORS = ['North', 'South', 'East', 'West'];

const valueAt = (hour: number, sensor: number): number =>
  18 + ((hour * 37 + sensor * 91) % 140) / 10;

const readings: Reading[] = Array.from({ length: 500 }, (_, hour) => ({
  hour,
  values: Array.from(SENSORS.keys(), (sensor) => valueAt(hour, sensor)),
}));

const columns: NuiTableColumn<Reading>[] = SENSORS.map((label, sensor) => ({
  key: `s${sensor}`,
  label,
  type: 'number',
  width: 130,
  sortable: false,
  filter: false,
  value: (row) => row.values[sensor],
}));

const ROW_HEADERS = { resizable: true };

const ranges = ref<NuiTableRanges>([]);
const rowHeights = ref<NuiTableRowHeights>({ 2: 56 });

const selectedCells = computed(() =>
  ranges.value.reduce(
    (sum, { from, to }) =>
      sum + (Math.abs(to.row - from.row) + 1) * (Math.abs(to.col - from.col) + 1),
    0,
  ),
);

const keyOf = (reading: Reading): number => reading.hour;
</script>
