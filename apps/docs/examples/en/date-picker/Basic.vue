<template>
  <NuiDatePicker
    v-model="trip"
    label="Trip date"
    description="Type it or pick it in the calendar"
    min="2026-09-27"
    today="2026-09-27"
    clearable
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiDatePicker } from '@numior/vue';

const trip = ref<string | null>('2026-10-05');
</script>
