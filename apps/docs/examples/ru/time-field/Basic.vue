<template>
  <NuiTimeField
    v-model="pickup"
    label="Время самовывоза"
    description="Пункт выдачи открыт с 10:00 до 20:00"
    min="10:00"
    max="20:00"
    :step="30"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTimeField } from '@numior/vue';

const pickup = ref<string | null>('12:30');
</script>
