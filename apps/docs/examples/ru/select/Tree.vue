<template>
  <NuiSelect
    v-model="category"
    label="Категория"
    :options="categories"
    placeholder="Выберите категорию"
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
    label: 'Электроника',
    children: [
      { value: 'phones', label: 'Телефоны' },
      { value: 'laptops', label: 'Ноутбуки' },
    ],
  },
  {
    value: 'clothes',
    label: 'Одежда',
    children: [
      { value: 'shoes', label: 'Обувь' },
      { value: 'jackets', label: 'Куртки' },
    ],
  },
  { value: 'books', label: 'Книги' },
];
</script>
