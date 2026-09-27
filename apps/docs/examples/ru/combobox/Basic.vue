<template>
  <NuiCombobox
    v-model="city"
    :options="cities"
    label="Город доставки"
    placeholder="Начните вводить"
    clearable
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiCombobox, type NuiOptionSource } from '@numior/vue';

const city = ref<string | null>(null);

const cities: NuiOptionSource<string> = [
  { value: 'kzn', label: 'Казань' },
  { value: 'klg', label: 'Калуга' },
  { value: 'msk', label: 'Москва' },
  { value: 'smr', label: 'Самара' },
  { value: 'spb', label: 'Санкт-Петербург' },
];
</script>
