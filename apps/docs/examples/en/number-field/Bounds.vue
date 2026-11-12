<template>
  <NuiNumberField
    v-model="discount"
    label="Promo code discount"
    description="From 0 to 50% in steps of 5"
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
