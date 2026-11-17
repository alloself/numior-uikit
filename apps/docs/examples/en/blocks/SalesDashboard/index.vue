<template>
  <div class="mx-auto flex max-w-6xl flex-col gap-4 p-6">
    <div class="flex flex-col gap-1">
      <h1 class="m-0 text-xl font-semibold tracking-tight">Sales</h1>
      <p class="m-0 text-sm text-muted-foreground">Orders from the last two weeks</p>
    </div>
    <div class="grid gap-4 sm:grid-cols-3">
      <NuiCard v-for="fact in facts" :key="fact.label">
        <NuiCardHeader>
          <NuiCardDescription>{{ fact.label }}</NuiCardDescription>
          <NuiCardTitle>{{ fact.value }}</NuiCardTitle>
        </NuiCardHeader>
      </NuiCard>
    </div>
    <div class="grid gap-4 lg:grid-cols-3">
      <NuiCard class="lg:col-span-2">
        <NuiCardHeader>
          <NuiCardTitle>Revenue by day</NuiCardTitle>
        </NuiCardHeader>
        <NuiCardContent class="min-h-72 flex-1">
          <NuiChart :spec="revenue" label="Revenue by day" height="fill" />
        </NuiCardContent>
      </NuiCard>
      <NuiCard>
        <NuiCardHeader>
          <NuiCardTitle>Orders by status</NuiCardTitle>
        </NuiCardHeader>
        <NuiCardContent>
          <NuiChart :spec="statuses" label="Orders by status" :height="DOUGHNUT_HEIGHT" />
        </NuiCardContent>
      </NuiCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { countBy, sumBy, uniq } from 'lodash-es';
import { NuiChart, type ChartSpec } from '@numior/kit/charts';
import {
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardHeader,
  NuiCardTitle,
} from '@numior/kit';
import { ORDER_STATUSES, orders } from '#demo/orders';

const DOUGHNUT_HEIGHT = 240;

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const total = sumBy(orders, (order) => order.total);
const counts = countBy(orders, (order) => order.status);
const kinds = uniq(orders.map((order) => order.status));

const facts = [
  { label: 'Revenue', value: money.format(total) },
  { label: 'Orders', value: String(orders.length) },
  { label: 'Per order', value: money.format(total / orders.length) },
];

const revenue: ChartSpec = {
  kind: 'column',
  categories: { kind: 'time', values: orders.map((order) => Date.parse(order.date)) },
  series: [{ id: 'revenue', name: 'Revenue, $', values: orders.map((order) => order.total) }],
};

const statuses: ChartSpec = {
  kind: 'doughnut',
  categories: {
    kind: 'text',
    labels: kinds.map((status) => ORDER_STATUSES[status]),
  },
  series: [{ id: 'orders', name: 'Orders', values: kinds.map((status) => counts[status] ?? 0) }],
};
</script>
