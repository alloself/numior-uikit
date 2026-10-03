<template>
  <NuiDatePicker
    v-model="delivery"
    label="Дата доставки"
    description="Щелчок по полю открывает календарь"
    today="2026-09-27"
    open-on-click
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiDatePicker } from '@numior/vue';

const delivery = ref<string | null>(null);
</script>
