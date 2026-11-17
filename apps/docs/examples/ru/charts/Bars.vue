<template>
  <NuiChart :spec="revenue" label="Товары с наибольшей выручкой" :height="HEIGHT" class="w-full" />
</template>

<script setup lang="ts">
import { groupBy, orderBy, sumBy, take } from 'lodash-es';
import { NuiChart, type ChartSpec } from '@numior/kit/charts';
import { ordersOf } from '#demo/many-orders';
import { products } from '#demo/products';

const HEIGHT = 300;
const SHOWN = 10;

const bySku = groupBy(
  ordersOf(600).flatMap((order) => order.lines),
  (line) => line.sku,
);

const leaders = take(
  orderBy(
    products.map((product) => ({
      name: product.name,
      revenue: sumBy(bySku[product.sku], (line) => line.quantity * line.price),
    })),
    [(product) => product.revenue],
    ['desc'],
  ),
  SHOWN,
);

const revenue: ChartSpec = {
  kind: 'bar',
  categories: { kind: 'text', labels: leaders.map((product) => product.name) },
  series: [
    { id: 'revenue', name: 'Выручка, ₽', values: leaders.map((product) => product.revenue) },
  ],
};
</script>
