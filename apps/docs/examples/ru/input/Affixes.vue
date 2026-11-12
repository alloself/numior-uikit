<template>
  <NuiInput v-model="query" label="Поиск заказа" placeholder="Номер или покупатель">
    <template #prefix><NuiIcon icon="search" /></template>
  </NuiInput>
  <NuiInput v-model="size" label="Габариты упаковки">
    <template #suffix>см</template>
  </NuiInput>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiIcon, NuiInput } from '@numior/vue';

const query = ref('');
const size = ref('60 × 40 × 30');
</script>
