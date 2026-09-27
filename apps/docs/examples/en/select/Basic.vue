<template>
  <NuiSelect
    label="Country"
    v-model="country"
    :options="countries"
    placeholder="Pick a country"
    clearable
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiSelect, type NuiOptionSource } from '@numior/vue';

const country = ref<string | null>(null);

const countries: NuiOptionSource<string> = [
  { value: 'at', label: 'Austria' },
  { value: 'de', label: 'Germany' },
  { value: 'jp', label: 'Japan' },
];
</script>
