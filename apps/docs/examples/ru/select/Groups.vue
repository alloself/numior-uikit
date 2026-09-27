<template>
  <NuiSelect label="Город" v-model="city" :options="cities" placeholder="Выберите город" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiSelect, type NuiOptionSource } from '@numior/vue';

const city = ref<string | null>(null);

const cities: NuiOptionSource<string> = [
  {
    label: 'Европа',
    items: [
      { value: 'vie', label: 'Вена' },
      { value: 'ber', label: 'Берлин' },
    ],
  },
  {
    label: 'Азия',
    items: [
      { value: 'tyo', label: 'Токио' },
      { value: 'sel', label: 'Сеул', disabled: true },
    ],
  },
];
</script>
