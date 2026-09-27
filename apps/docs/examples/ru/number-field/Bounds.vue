<template>
  <NuiNumberField
    v-model="quantity"
    label="Количество"
    description="От 1 до 10"
    :min="1"
    :max="10"
  />
  <NuiNumberField
    v-model="discount"
    label="Скидка"
    description="Проценты без степперов"
    :min="0"
    :max="1"
    :step="0.01"
    :steppers="false"
    :format-options="{ style: 'percent' }"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiNumberField } from '@numior/vue';

const quantity = ref<number | null>(2);
const discount = ref<number | null>(0.15);
</script>
