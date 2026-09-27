<template>
  <NuiField label="Small">
    <NuiSelect v-model="value" :options="options" size="sm" />
  </NuiField>
  <NuiField label="Regular">
    <NuiSelect v-model="value" :options="options" />
  </NuiField>
  <NuiField label="Large">
    <NuiSelect v-model="value" :options="options" size="lg" />
  </NuiField>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiField, NuiSelect, type NuiOptionSource } from '@numior/vue';

const value = ref<string | null>('a');

const options: NuiOptionSource<string> = [
  { value: 'a', label: 'First' },
  { value: 'b', label: 'Second' },
];
</script>
