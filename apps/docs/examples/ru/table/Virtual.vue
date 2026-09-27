<template>
  <NuiTable
    :columns="columns"
    :rows="rows"
    :get-key="keyOf"
    virtual
    height="16rem"
    sticky-header
    size="sm"
    caption="3000 строк"
  />
</template>

<script setup lang="ts">
import { NuiTable, type NuiTableColumn } from '@numior/vue';

interface Reading {
  readonly id: number;
  readonly sensor: string;
  readonly value: number;
}

const rows: Reading[] = Array.from({ length: 3000 }, (_, index) => ({
  id: index + 1,
  sensor: `Датчик ${(index % 24) + 1}`,
  value: 18 + ((index * 7) % 15),
}));

const columns: NuiTableColumn<Reading>[] = [
  { key: 'id', label: '№', width: 96 },
  { key: 'sensor', label: 'Датчик' },
  { key: 'value', label: 'Температура, °C', align: 'end', width: 160 },
];

const keyOf = (reading: Reading): string => String(reading.id);
</script>
