<template>
  <NuiSelect
    v-model="category"
    :options="categories"
    label="Категория товара"
    placeholder="Выберите категорию"
    clearable
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiSelect } from '@numior/kit';
import { categories } from '#demo/products';

const category = ref<string | null>('lamps');
</script>
