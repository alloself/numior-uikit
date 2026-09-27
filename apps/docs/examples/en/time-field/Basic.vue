<template>
  <NuiTimeField
    v-model="start"
    label="Shift start"
    description="From 09:00 to 18:00, 30-minute step"
    min="09:00"
    max="18:00"
    :step="30"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTimeField } from '@numior/vue';

const start = ref<string | null>('09:30');
</script>
