<template>
  <NuiList
    v-model="city"
    :items="cities"
    selectable="single"
    variant="bordered"
    label="Город"
    class="nui-w-full nui-max-w-sm"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiList, type NuiListSource, type NuiOption } from '@numior/vue';

const city = ref<string | null>('ber');

const cities: NuiListSource<NuiOption<string>> = [
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
      { value: 'sel', label: 'Сеул' },
    ],
  },
];
</script>
