<template>
  <NuiNumberField
    v-model="discount"
    label="Скидка по промокоду"
    description="От 0 до 50 % с шагом 5"
    :min="0"
    :max="50"
    :step="5"
    :format-options="{ style: 'unit', unit: 'percent' }"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiNumberField } from '@numior/vue';

const discount = ref<number | null>(10);
</script>
