<template>
  <NuiTimeField
    v-model="shipped"
    label="Отгрузка со склада"
    description="Заказ 20408 передан курьеру"
    seconds
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTimeField } from '@numior/vue';

const shipped = ref<string | null>('14:05:37');
</script>
