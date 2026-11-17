<template>
  <NuiInput v-model="query" label="Order search" placeholder="Number or customer">
    <template #prefix><NuiIcon icon="search" /></template>
  </NuiInput>
  <NuiInput v-model="size" label="Package size">
    <template #suffix>in</template>
  </NuiInput>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiIcon, NuiInput } from '@numior/kit';

const query = ref('');
const size = ref('24 × 16 × 12');
</script>
