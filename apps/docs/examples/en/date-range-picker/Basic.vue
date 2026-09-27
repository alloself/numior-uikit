<template>
  <NuiDateRangePicker
    v-model="period"
    label="Report period"
    :presets="presets"
    today="2026-09-27"
    clearable
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiDateRangePicker, addDays, type NuiDatePreset, type NuiDateRange } from '@numior/vue';

const presets: NuiDatePreset[] = [
  { label: 'Last 7 days', range: (today) => ({ start: addDays(today, -6), end: today }) },
  { label: 'Last 30 days', range: (today) => ({ start: addDays(today, -29), end: today }) },
];

const period = ref<NuiDateRange>({ start: '2026-09-01', end: '2026-09-27' });
</script>
