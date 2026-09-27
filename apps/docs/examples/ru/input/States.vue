<template>
  <NuiInput model-value="ORD-20419" label="Номер заказа" readonly />
  <NuiInput model-value="Титова Анна" label="Получатель" disabled />
  <NuiInput
    v-model="email"
    type="email"
    label="Почта"
    error="Укажите адрес с символом @"
    reserve-error
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiInput } from '@numior/vue';

const email = ref('anna.titova');
</script>
