<template>
  <NuiTree
    :items="nodes"
    virtual
    height="14rem"
    variant="outline"
    label="Orders of the last six months"
    class="w-full max-w-sm"
  />
</template>

<script setup lang="ts">
import { NuiTree, type NuiTreeItem } from '@numior/vue';
import { ordersOf } from '#demo/many-orders';

const nodes: NuiTreeItem<string>[] = ordersOf(2000).map((order) => ({
  value: String(order.id),
  label: `Order ${order.id}, ${order.customer}`,
  children: order.lines.map((line, index) => ({
    value: `${order.id}-${index}`,
    label: `${line.name} × ${line.quantity}`,
  })),
}));
</script>
