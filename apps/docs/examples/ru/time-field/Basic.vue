<template>
  <NuiTimeField
    v-model="start"
    label="Начало смены"
    description="С 09:00 до 18:00, шаг 30 минут"
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
