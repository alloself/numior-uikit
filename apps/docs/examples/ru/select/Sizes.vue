<template>
  <NuiField label="Маленький">
    <NuiSelect v-model="value" :options="options" size="sm" />
  </NuiField>
  <NuiField label="Обычный">
    <NuiSelect v-model="value" :options="options" />
  </NuiField>
  <NuiField label="Большой">
    <NuiSelect v-model="value" :options="options" size="lg" />
  </NuiField>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiField, NuiSelect, type NuiOptionSource } from '@numior/vue';

const value = ref<string | null>('a');

const options: NuiOptionSource<string> = [
  { value: 'a', label: 'Первый' },
  { value: 'b', label: 'Второй' },
];
</script>
