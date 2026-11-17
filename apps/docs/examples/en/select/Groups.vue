<template>
  <NuiSelect v-model="city" :options="cities" label="Delivery city" placeholder="Pick a city" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiSelect, type NuiOptionSource } from '@numior/kit';

const city = ref<string | null>(null);

const cities: NuiOptionSource<string> = [
  { label: 'Northeast', items: [{ value: 'bos', label: 'Boston' }] },
  { label: 'Midwest', items: [{ value: 'chi', label: 'Chicago' }] },
  {
    label: 'Northwest',
    items: [
      { value: 'sea', label: 'Seattle' },
      { value: 'pdx', label: 'Portland' },
    ],
  },
  { label: 'South', items: [{ value: 'aus', label: 'Austin' }] },
  {
    label: 'Mountain states',
    items: [
      {
        value: 'den',
        label: 'Denver',
        description: 'Delivery is paused until Monday',
        disabled: true,
      },
    ],
  },
];
</script>
