<template>
  <NuiDatePicker
    v-model="trip"
    label="Дата поездки"
    description="Введите или выберите в календаре"
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
