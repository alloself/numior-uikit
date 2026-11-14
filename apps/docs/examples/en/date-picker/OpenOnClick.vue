<template>
  <NuiDatePicker
    v-model="pickup"
    label="Pickup date"
    description="The order waits at the pickup point for three days"
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
