<template>
  <div class="flex flex-col gap-3">
    <NuiTable
      v-model:ranges="ranges"
      :columns="columns"
      :rows="readings"
      :get-key="keyOf"
      row-headers
      bordered
      height="18rem"
      :column-menu="false"
      caption="Показания датчиков, °C"
    />
    <p class="text-sm text-muted-foreground">Выделено ячеек: {{ selectedCells }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiTable, type NuiTableColumn, type NuiTableRanges } from '@numior/table';

interface Reading {
  readonly hour: number;
  readonly values: readonly number[];
}

const SENSORS = ['Север', 'Юг', 'Восток', 'Запад'];

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

const ranges = ref<NuiTableRanges>([]);

const selectedCells = computed(() =>
  ranges.value.reduce(
    (sum, { from, to }) =>
      sum + (Math.abs(to.row - from.row) + 1) * (Math.abs(to.col - from.col) + 1),
    0,
  ),
);

const keyOf = (reading: Reading): number => reading.hour;
</script>
