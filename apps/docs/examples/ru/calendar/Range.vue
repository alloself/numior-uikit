<template>
  <NuiCalendar v-model="range" mode="range" :months="2" :presets="presets" today="2026-09-27" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiCalendar, addDays, type NuiCalendarValue, type NuiDatePreset } from '@numior/vue';

const presets: NuiDatePreset[] = [
  { label: 'Последние 7 дней', range: (today) => ({ start: addDays(today, -6), end: today }) },
  { label: 'Последние 30 дней', range: (today) => ({ start: addDays(today, -29), end: today }) },
];

const range = ref<NuiCalendarValue>({ start: '2026-09-07', end: '2026-09-13' });
</script>
