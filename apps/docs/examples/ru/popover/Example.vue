<template>
  <NuiPopover>
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="outline" tone="neutral">Мало на складе</NuiButton>
    </template>
    <ul class="flex flex-col gap-1 text-sm">
      <li v-for="product in low" :key="product.sku">{{ product.name }}: {{ product.stock }} шт.</li>
    </ul>
  </NuiPopover>
</template>

<script setup lang="ts">
import { NuiButton, NuiPopover } from '@numior/kit';
import { products } from '#demo/products';

const low = products.filter((product) => product.stock < 10);
</script>
