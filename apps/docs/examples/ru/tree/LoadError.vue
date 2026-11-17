<template>
  <div class="flex w-full max-w-sm flex-col gap-3">
    <NuiTree
      v-model:expanded="expanded"
      :items="groups"
      variant="outline"
      label="Товары по категориям"
      class="w-full"
      @load="load"
    />
    <NuiAlert
      v-if="error"
      tone="error"
      variant="soft"
      title="Не удалось загрузить товары"
      :description="error"
      closable
      @close="error = undefined"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { promiseTimeout } from '@vueuse/core';
import { NuiAlert, NuiTree, type NuiTreeItem } from '@numior/kit';
import { categories, products } from '#demo/products';

const groups = ref<NuiTreeItem<string>[]>(
  categories.map(({ value, label }) => ({ value, label, lazy: true })),
);

const expanded = ref<string[]>([]);
const error = ref<string>();
const failed = new Set<string>();

const productsOf = (value: string): NuiTreeItem<string>[] => {
  const kinds = categories.find((category) => category.value === value)?.children ?? [];

  return products.reduce<NuiTreeItem<string>[]>((found, product) => {
    if (kinds.some((kind) => kind.value === product.category)) {
      found.push({ value: product.sku, label: product.name });
    }
    return found;
  }, []);
};

const fetchProducts = async (value: string): Promise<NuiTreeItem<string>[]> => {
  await promiseTimeout(600);

  if (value === 'lighting' && !failed.has(value)) {
    failed.add(value);
    throw new Error('timeout');
  }
  return productsOf(value);
};

const load = async (item: NuiTreeItem<string>): Promise<void> => {
  error.value = undefined;

  try {
    const children = await fetchProducts(item.value);

    groups.value = groups.value.map((group) =>
      group.value === item.value ? { ...group, children } : group,
    );
  } catch {
    expanded.value = expanded.value.filter((value) => value !== item.value);
    error.value = `«${item.label}»: сервер не ответил. Раскройте категорию ещё раз.`;
  }
};
</script>
