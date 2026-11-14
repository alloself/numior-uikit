<template>
  <NuiCalendar v-model="period" mode="range" :months="2" :presets="presets" today="2026-09-27" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { addDays } from '@numior/primitives';
import { NuiCalendar, type NuiCalendarValue, type NuiDatePreset } from '@numior/vue';

const presets: NuiDatePreset[] = [
  { label: 'Last 7 days', range: (today) => ({ start: addDays(today, -6), end: today }) },
  { label: 'Last 30 days', range: (today) => ({ start: addDays(today, -29), end: today }) },
];

const period = ref<NuiCalendarValue>({ start: '2026-09-14', end: '2026-09-20' });
</script>
