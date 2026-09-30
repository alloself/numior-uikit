<template>
  <NuiSelect
    v-model="category"
    label="Category"
    :options="categories"
    placeholder="Pick a category"
    clearable
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiSelect, type NuiTreeItem } from '@numior/vue';

const category = ref<string | null>('laptops');

const categories: NuiTreeItem<string>[] = [
  {
    value: 'electronics',
    label: 'Electronics',
    children: [
      { value: 'phones', label: 'Phones' },
      { value: 'laptops', label: 'Laptops' },
    ],
  },
  {
    value: 'clothes',
    label: 'Clothes',
    children: [
      { value: 'shoes', label: 'Shoes' },
      { value: 'jackets', label: 'Jackets' },
    ],
  },
  { value: 'books', label: 'Books' },
];
</script>
