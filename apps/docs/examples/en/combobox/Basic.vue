<template>
  <NuiCombobox
    v-model="city"
    :options="cities"
    label="Delivery city"
    placeholder="Start typing"
    clearable
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiCombobox, type NuiOptionSource } from '@numior/vue';

const city = ref<string | null>(null);

const cities: NuiOptionSource<string> = [
  { value: 'lis', label: 'Lisbon' },
  { value: 'por', label: 'Porto' },
  { value: 'brg', label: 'Braga' },
  { value: 'cbr', label: 'Coimbra' },
  { value: 'fnc', label: 'Funchal' },
];
</script>
