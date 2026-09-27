<template>
  <NuiField label="City">
    <NuiSelect v-model="city" :options="cities" placeholder="Pick a city" />
  </NuiField>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiField, NuiSelect, type NuiOptionSource } from '@numior/vue';

const city = ref<string | null>(null);

const cities: NuiOptionSource<string> = [
  {
    label: 'Europe',
    items: [
      { value: 'vie', label: 'Vienna' },
      { value: 'ber', label: 'Berlin' },
    ],
  },
  {
    label: 'Asia',
    items: [
      { value: 'tyo', label: 'Tokyo' },
      { value: 'sel', label: 'Seoul', disabled: true },
    ],
  },
];
</script>
