<template>
  <NuiTable
    v-model:expanded="expanded"
    :columns="columns"
    :rows="sections"
    :get-key="keyOf"
    :get-children="childrenOf"
    :has-children="isLazy"
    caption="Catalog by section"
    @load="load"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTable, type NuiTableColumn, type TableNodeId } from '@numior/table';
import { categories, products, type Category } from '#demo/products';

interface Section {
  readonly id: string;
  readonly name: string;
  readonly count: number;
  readonly stock: number;
  readonly children?: readonly Section[];
  readonly lazy?: boolean;
}

const LAZY = 'textile';
const LOAD_DELAY = 700;

const sectionOf = (category: Category): Section => {
  const leaves = new Set((category.children ?? [category]).map((leaf) => leaf.value));

  return products.reduce<Section>(
    (section, product) =>
      leaves.has(product.category)
        ? { ...section, count: section.count + 1, stock: section.stock + product.stock }
        : section,
    { id: category.value, name: category.label, count: 0, stock: 0 },
  );
};

const subsectionsOf = (category: Category): readonly Section[] =>
  (category.children ?? []).map(sectionOf);

const SECTIONS: readonly Section[] = categories.map((category) =>
  category.value === LAZY
    ? { ...sectionOf(category), lazy: true }
    : { ...sectionOf(category), children: subsectionsOf(category) },
);

const LOADED = new Map(categories.map((category) => [category.value, subsectionsOf(category)]));

const columns: NuiTableColumn<Section>[] = [
  { key: 'name', label: 'Section', type: 'text', width: 220, flex: 1, value: (row) => row.name },
  { key: 'count', label: 'Products', type: 'number', width: 120, value: (row) => row.count },
  { key: 'stock', label: 'In stock', type: 'number', width: 120, value: (row) => row.stock },
];

const keyOf = (section: Section): string => section.id;
const childrenOf = (section: Section): readonly Section[] | undefined => section.children;
const isLazy = (section: Section): boolean => section.lazy === true;
const sections = ref<readonly Section[]>(SECTIONS);
const expanded = ref<TableNodeId[]>(['furniture']);

const load = (section: Section): void => {
  setTimeout(() => {
    sections.value = sections.value.map((entry) =>
      entry.id === section.id ? { ...entry, children: LOADED.get(entry.id) ?? [] } : entry,
    );
  }, LOAD_DELAY);
};
</script>
