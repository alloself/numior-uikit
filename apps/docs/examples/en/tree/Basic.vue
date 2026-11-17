<template>
  <NuiTree
    v-model="category"
    v-model:expanded="expanded"
    :items="categories"
    variant="outline"
    label="Product categories"
    class="w-full max-w-sm"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTree } from '@numior/kit';
import { categories } from '#demo/products';

const category = ref<string | null>('tables');
const expanded = ref(['furniture']);
</script>
