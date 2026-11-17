<template>
  <NuiDatePicker
    v-model="delivery"
    label="Дата доставки"
    description="Доставляем на следующий день после оплаты"
    min="2026-09-27"
    today="2026-09-27"
    clearable
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiDatePicker } from '@numior/kit';

const delivery = ref<string | null>('2026-09-29');
</script>
