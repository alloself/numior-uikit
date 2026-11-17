<template>
  <NuiTree
    :items="groups"
    variant="outline"
    label="Товары по категориям"
    class="w-full max-w-sm"
    @load="load"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { promiseTimeout } from '@vueuse/core';
import { NuiTree, type NuiTreeItem } from '@numior/kit';
import { categories, products } from '#demo/products';

const groups = ref<NuiTreeItem<string>[]>(
  categories.map(({ value, label }) => ({ value, label, lazy: true })),
);

const productsOf = (value: string): NuiTreeItem<string>[] => {
  const kinds = categories.find((category) => category.value === value)?.children ?? [];

  return products.reduce<NuiTreeItem<string>[]>((found, product) => {
    if (kinds.some((kind) => kind.value === product.category)) {
      found.push({ value: product.sku, label: product.name });
    }
    return found;
  }, []);
};

const load = async (item: NuiTreeItem<string>): Promise<void> => {
  await promiseTimeout(600);

  groups.value = groups.value.map((group) =>
    group.value === item.value ? { ...group, children: productsOf(group.value) } : group,
  );
};
</script>
