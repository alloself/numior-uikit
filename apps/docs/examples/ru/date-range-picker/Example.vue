<template>
  <NuiDateRangePicker v-model="period" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiDateRangePicker, type NuiDateRange } from '@numior/vue';

const period = ref<NuiDateRange>({ start: '2026-09-01', end: '2026-09-30' });
</script>
