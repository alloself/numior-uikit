<template>
  <NuiTree
    :items="nodes"
    virtual
    height="14rem"
    label="Большое дерево"
    class="nui-w-full nui-max-w-sm"
  />
</template>

<script setup lang="ts">
import { NuiTree, type NuiTreeItem } from '@numior/vue';

const nodes: NuiTreeItem<string>[] = Array.from({ length: 5000 }, (_, index) => ({
  value: `order-${index + 1}`,
  label: `Заказ ${index + 1}`,
  children: [{ value: `order-${index + 1}-items`, label: 'Состав заказа' }],
}));
</script>
