<template>
  <NuiSelect v-model="city" :options="cities" label="Город доставки" placeholder="Выберите город" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiSelect, type NuiOptionSource } from '@numior/kit';

const city = ref<string | null>(null);

const cities: NuiOptionSource<string> = [
  { label: 'Центр', items: [{ value: 'msk', label: 'Москва' }] },
  { label: 'Северо-Запад', items: [{ value: 'spb', label: 'Санкт-Петербург' }] },
  {
    label: 'Поволжье',
    items: [
      { value: 'kzn', label: 'Казань' },
      { value: 'smr', label: 'Самара' },
    ],
  },
  { label: 'Урал', items: [{ value: 'ekb', label: 'Екатеринбург' }] },
  {
    label: 'Сибирь',
    items: [
      {
        value: 'nsk',
        label: 'Новосибирск',
        description: 'Доставка приостановлена до понедельника',
        disabled: true,
      },
    ],
  },
];
</script>
