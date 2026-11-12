<template>
  <NuiCode :code="source" language="ts" line-numbers :highlight="[5]" />
</template>

<script setup lang="ts">
import { NuiCode } from '@numior/vue';

const source = [
  'const totalOf = (order: Order, discount: number): number => {',
  '  const prices = order.lines.map((line) => line.price * line.quantity);',
  '  const sum = prices.reduce((total, price) => total + price, 0);',
  '',
  '  return Math.round(sum * (1 - discount));',
  '};',
].join('\n');
</script>
