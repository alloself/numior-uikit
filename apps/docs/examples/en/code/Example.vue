<template>
  <NuiCode :code="source" language="json" />
</template>

<script setup lang="ts">
import { NuiCode } from '@numior/kit';
import { orders } from '#demo/orders';

const source = orders
  .slice(0, 8)
  .map((order) => JSON.stringify(order))
  .join('\n');
</script>
