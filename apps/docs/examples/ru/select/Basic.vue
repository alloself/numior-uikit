<template>
  <NuiSelect
    label="Страна"
    v-model="country"
    :options="countries"
    placeholder="Выберите страну"
    clearable
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiSelect, type NuiOptionSource } from '@numior/vue';

const country = ref<string | null>(null);

const countries: NuiOptionSource<string> = [
  { value: 'at', label: 'Австрия' },
  { value: 'de', label: 'Германия' },
  { value: 'jp', label: 'Япония' },
];
</script>
