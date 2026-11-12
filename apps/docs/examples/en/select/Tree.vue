<template>
  <NuiSelect
    v-model="category"
    :options="categories"
    label="Product category"
    placeholder="Pick a category"
    clearable
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiSelect } from '@numior/vue';
import { categories } from '#demo/products';

const category = ref<string | null>('lamps');
</script>
