<template>
  <NuiChart :spec="statuses" label="Заказы по статусам" :height="HEIGHT" class="w-full" />
</template>

<script setup lang="ts">
import { countBy } from 'lodash-es';
import { NuiChart, type ChartSpec } from '@numior/kit/charts';
import { ordersOf } from '#demo/many-orders';
import { ORDER_STATUSES } from '#demo/orders';

const HEIGHT = 260;

const counts = countBy(ordersOf(600), (order) => order.status);
const kinds = Object.entries(ORDER_STATUSES);

const statuses: ChartSpec = {
  kind: 'doughnut',
  categories: { kind: 'text', labels: kinds.map(([, name]) => name) },
  series: [{ id: 'orders', name: 'Заказы', values: kinds.map(([status]) => counts[status] ?? 0) }],
};
</script>
