<template>
  <NuiTree
    v-model:expanded="expanded"
    :items="marked"
    variant="outline"
    label="Каталог"
    class="w-full max-w-sm"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTree, type NuiTreeItem } from '@numior/kit';
import { categories, products, type Category } from '#demo/products';

const countOf = (category: Category): number =>
  category.children === undefined
    ? products.reduce(
        (count, product) => (product.category === category.value ? count + 1 : count),
        0,
      )
    : category.children.reduce((sum, child) => sum + countOf(child), 0);

const markedOf = (category: Category): NuiTreeItem<string> => ({
  value: category.value,
  label: category.label,
  badge: countOf(category),
  current: category.value === 'lamps',
  children: category.children?.map(markedOf),
});

const marked = categories.map(markedOf);

const expanded = ref(['lighting']);
</script>
