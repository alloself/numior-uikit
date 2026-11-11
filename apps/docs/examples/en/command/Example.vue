<template>
  <NuiCommand :items="commands" class="w-full max-w-md" />
</template>

<script setup lang="ts">
import { NuiCommand, type NuiCommandSource } from '@numior/vue';

const commands: NuiCommandSource = [
  {
    label: 'Orders',
    items: [
      { value: 'order', label: 'Create an order', icon: 'plus' },
      { value: 'refund', label: 'Start a refund', icon: 'refresh' },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { value: 'product', label: 'Add a product', icon: 'plus' },
      { value: 'prices', label: 'Upload prices', icon: 'upload' },
    ],
  },
];
</script>
