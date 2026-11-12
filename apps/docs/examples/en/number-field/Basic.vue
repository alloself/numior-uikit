<template>
  <NuiNumberField
    v-model="price"
    label="Price"
    :min="0"
    :format-options="{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }"
  />
  <NuiNumberField v-model="stock" label="In stock" :min="0" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiNumberField } from '@numior/vue';
import { products } from '#demo/products';

const [chair] = products;

const price = ref<number | null>(chair?.price ?? null);
const stock = ref<number | null>(chair?.stock ?? null);
</script>
