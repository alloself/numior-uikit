<template>
  <NuiNumberField v-model="weight" label="Weight, kg" locale="en-US" :step="0.1" />
  <NuiNumberField v-model="weight" label="Вес, кг" locale="ru-RU" :step="0.1" />
  <NuiNumberField v-model="weight" label="Gewicht, kg" locale="de-DE" :step="0.1" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiNumberField } from '@numior/vue';

const weight = ref<number | null>(1234.5);
</script>
