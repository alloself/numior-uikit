<template>
  <NuiList
    v-model="category"
    :items="groups"
    selectable="single"
    variant="outline"
    label="Категория товара"
    class="w-full max-w-sm"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiList, type NuiOptionSource } from '@numior/kit';
import { categories } from '#demo/products';

const groups: NuiOptionSource = categories.map((category) => ({
  label: category.label,
  items: (category.children ?? []).map(({ value, label }) => ({ value, label })),
}));

const category = ref<string | null>('tables');
</script>
