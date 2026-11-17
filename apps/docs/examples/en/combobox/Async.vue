<template>
  <NuiCombobox
    v-model="sku"
    :options="found"
    :filter="false"
    :loading="loading"
    label="Product"
    placeholder="Name or SKU"
    @search="search"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { promiseTimeout } from '@vueuse/core';
import { NuiCombobox, type NuiOption } from '@numior/kit';
import { products } from '#demo/products';

const catalog: NuiOption<string>[] = products.map((product) => ({
  value: product.sku,
  label: product.name,
  description: product.sku,
}));

const sku = ref<string | null>(null);
const found = ref(catalog);
const loading = ref(false);
const latest = ref('');

const matches = (option: NuiOption<string>, query: string): boolean =>
  `${option.label} ${option.value}`.toLowerCase().includes(query.toLowerCase());

const search = async (query: string): Promise<void> => {
  latest.value = query;
  loading.value = true;
  await promiseTimeout(400);

  if (query !== latest.value) {
    return;
  }
  found.value = catalog.filter((option) => matches(option, query));
  loading.value = false;
};
</script>
