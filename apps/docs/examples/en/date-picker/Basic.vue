<template>
  <NuiDatePicker
    v-model="delivery"
    label="Delivery date"
    description="We deliver the day after payment"
    min="2026-09-27"
    today="2026-09-27"
    clearable
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiDatePicker } from '@numior/vue';

const delivery = ref<string | null>('2026-09-29');
</script>
