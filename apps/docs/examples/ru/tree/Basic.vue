<template>
  <NuiTree
    v-model="category"
    v-model:expanded="expanded"
    :items="categories"
    variant="outline"
    label="Категории товаров"
    class="w-full max-w-sm"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTree } from '@numior/vue';
import { categories } from '#demo/products';

const category = ref<string | null>('tables');
const expanded = ref(['furniture']);
</script>
