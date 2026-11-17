<template>
  <NuiTable
    :columns="columns"
    :rows="readings"
    :get-key="keyOf"
    :pinned-rows="pinned"
    height="20rem"
    size="sm"
    caption="10,000 readings"
  />
</template>

<script setup lang="ts">
import { NuiTable, type NuiTableColumn } from '@numior/kit/table';

interface Reading {
  readonly id: number;
  readonly sensor: string;
  readonly zone: string;
  readonly value: number;
  readonly humidity: number;
  readonly at: number;
}

const ZONES = ['Warehouse', 'Workshop', 'Office', 'Server room'];
const START = Date.UTC(2026, 8, 1);
const MINUTE = 60_000;

const readings: Reading[] = Array.from({ length: 10_000 }, (_, index) => ({
  id: index + 1,
  sensor: `Sensor ${(index % 24) + 1}`,
  zone: ZONES[index % ZONES.length] ?? '',
  value: 18 + ((index * 7) % 15),
  humidity: 40 + ((index * 13) % 35),
  at: START + index * MINUTE,
}));

const pinned = readings.slice(0, 1);

const when = new Intl.DateTimeFormat('en-US', { dateStyle: 'short', timeStyle: 'short' });

const columns: NuiTableColumn<Reading>[] = [
  {
    key: 'id',
    label: '#',
    type: 'number',
    width: 88,
    pin: 'start',
    value: (row) => row.id,
    format: (value) => String(value),
  },
  { key: 'sensor', label: 'Sensor', type: 'text', width: 160, value: (row) => row.sensor },
  { key: 'zone', label: 'Zone', type: 'text', width: 140, filter: 'set', value: (row) => row.zone },
  {
    key: 'value',
    label: 'Temperature',
    type: 'number',
    width: 150,
    value: (row) => row.value,
    format: (value) => `${value} °C`,
  },
  {
    key: 'humidity',
    label: 'Humidity',
    type: 'number',
    width: 150,
    value: (row) => row.humidity,
    format: (value) => `${value} %`,
  },
  {
    key: 'at',
    label: 'Time',
    type: 'date',
    width: 180,
    value: (row) => row.at,
    format: (value) => when.format(value),
  },
];

const keyOf = (reading: Reading): number => reading.id;
</script>
