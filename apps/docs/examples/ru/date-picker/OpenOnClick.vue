<template>
  <NuiDatePicker
    v-model="pickup"
    label="Дата самовывоза"
    description="Заказ ждёт в пункте выдачи три дня"
    min="2026-09-27"
    today="2026-09-27"
    open-on-click
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiDatePicker } from '@numior/vue';

const pickup = ref<string | null>(null);
</script>
