<template>
  <NuiTabs v-model="category" :tabs="sections" label="Catalog sections" class="w-full max-w-md">
    <template #panel="{ tab }">
      <ul class="flex flex-col gap-1 text-sm">
        <li v-for="product in productsOf(tab.value)" :key="product.sku">
          {{ product.name }}, {{ product.stock }} in stock
        </li>
      </ul>
    </template>
  </NuiTabs>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTabs, type NuiTabDescriptor } from '@numior/kit';
import { categories, products, type Product } from '#demo/products';

const category = ref('lighting');

const sections: NuiTabDescriptor[] = categories.map(({ value, label }) => ({ value, label }));

const productsOf = (value: string): Product[] => {
  const kinds = categories.find((entry) => entry.value === value)?.children ?? [];

  return products.filter((product) => kinds.some((kind) => kind.value === product.category));
};
</script>
