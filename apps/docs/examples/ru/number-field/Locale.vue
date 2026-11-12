<template>
  <NuiNumberField v-model="weight" label="Вес поставки, кг" :step="0.1" />
  <NuiNumberField
    v-model="weight"
    label="В накладной для Германии, кг"
    locale="de-DE"
    :step="0.1"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiNumberField } from '@numior/vue';

const weight = ref<number | null>(1234.5);
</script>
