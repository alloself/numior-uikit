<template>
  <NuiChart :spec="sales" label="Price and sales by product" :height="HEIGHT" class="w-full" />
</template>

<script setup lang="ts">
import { groupBy, map, sumBy } from 'lodash-es';
import { NuiChart, type ChartSpec } from '@numior/kit/charts';
import { ordersOf } from '#demo/many-orders';
import { categories, products } from '#demo/products';

const HEIGHT = 280;

const bySku = groupBy(
  ordersOf(600).flatMap((order) => order.lines),
  (line) => line.sku,
);

const sales: ChartSpec = {
  kind: 'scatter',
  categories: { kind: 'number', values: products.map((product) => product.price) },
  categoryAxis: { title: 'Price, $' },
  valueAxis: { title: 'Units sold' },
  series: categories.map((group) => {
    const kinds = map(group.children, (child) => child.value);

    return {
      id: group.value,
      name: group.label,
      values: products.map((product) =>
        kinds.includes(product.category)
          ? sumBy(bySku[product.sku], (line) => line.quantity)
          : null,
      ),
    };
  }),
};
</script>
