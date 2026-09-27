<template>
  <NuiDatePicker
    v-model="meeting"
    label="Meeting"
    description="Date and time"
    time
    :time-step="30"
    today="2026-09-27"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiDatePicker } from '@numior/vue';

const meeting = ref<string | null>('2026-09-29T10:30');
</script>
