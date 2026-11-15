<template>
  <NuiDatePicker
    v-model="courier"
    label="Приезд курьера"
    description="Курьер позвонит за час до приезда"
    time
    :time-step="30"
    today="2026-09-27"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiDatePicker } from '@numior/vue';

const courier = ref<string | null>('2026-09-29T14:30');
</script>
