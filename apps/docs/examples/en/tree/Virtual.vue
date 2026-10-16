<template>
  <NuiTree
    variant="bordered"
    :items="nodes"
    virtual
    height="14rem"
    label="Large tree"
    class="w-full max-w-sm"
  />
</template>

<script setup lang="ts">
import { NuiTree, type NuiTreeItem } from '@numior/vue';

const nodes: NuiTreeItem<string>[] = Array.from({ length: 5000 }, (_, index) => ({
  value: `order-${index + 1}`,
  label: `Order ${index + 1}`,
  children: [{ value: `order-${index + 1}-items`, label: 'Order items' }],
}));
</script>
