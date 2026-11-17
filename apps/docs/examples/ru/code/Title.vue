<template>
  <NuiCode :code="source" title="orders.csv" />
</template>

<script setup lang="ts">
import { NuiCode } from '@numior/kit';
import { orders } from '#demo/orders';

const source = orders
  .slice(0, 4)
  .map((order) => [order.id, order.customer, order.city, order.total].join(','))
  .join('\n');
</script>
