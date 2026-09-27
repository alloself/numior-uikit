<template>
  <NuiList
    v-model="city"
    :items="cities"
    selectable="single"
    variant="bordered"
    label="City"
    class="nui-w-full nui-max-w-sm"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiList, type NuiListSource, type NuiOption } from '@numior/vue';

const city = ref<string | null>('ber');

const cities: NuiListSource<NuiOption<string>> = [
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
      { value: 'sel', label: 'Seoul' },
    ],
  },
];
</script>
