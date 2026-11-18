<template>
  <NuiCard>
    <NuiCardHeader>
      <NuiCardTitle>Catalog</NuiCardTitle>
      <NuiCardDescription>The number next to a section counts products in stock</NuiCardDescription>
    </NuiCardHeader>
    <NuiCardContent>
      <NuiTree
        v-model="section"
        v-model:expanded="expanded"
        :items="marked"
        label="Catalog sections"
      />
    </NuiCardContent>
  </NuiCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardHeader,
  NuiCardTitle,
  NuiTree,
  type NuiTreeItem,
} from '@numior/kit';
import { categories, products, type Category } from '#demo/products';

const countOf = (category: Category): number =>
  category.children === undefined
    ? products.reduce(
        (count, product) =>
          product.category === category.value && product.stock > 0 ? count + 1 : count,
        0,
      )
    : category.children.reduce((sum, child) => sum + countOf(child), 0);

const markedOf = (category: Category): NuiTreeItem<string> => ({
  value: category.value,
  label: category.label,
  badge: countOf(category),
  children: category.children?.map(markedOf),
});

const marked = categories.map(markedOf);

const section = ref<string | null>('seating');
const expanded = ref(['furniture', 'lighting']);
</script>
