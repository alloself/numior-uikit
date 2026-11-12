<template>
  <div class="mx-auto flex max-w-6xl flex-col gap-4 p-6">
    <div class="flex flex-col gap-1">
      <h1 class="m-0 text-xl font-semibold tracking-tight">Продажи</h1>
      <p class="m-0 text-sm text-muted-foreground">Заказы за последние две недели</p>
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
          <NuiCardTitle>Выручка по дням</NuiCardTitle>
        </NuiCardHeader>
        <NuiCardContent class="min-h-72 flex-1">
          <NuiChart :spec="revenue" label="Выручка по дням" height="fill" />
        </NuiCardContent>
      </NuiCard>
      <NuiCard>
        <NuiCardHeader>
          <NuiCardTitle>Заказы по статусам</NuiCardTitle>
        </NuiCardHeader>
        <NuiCardContent>
          <NuiChart :spec="statuses" label="Заказы по статусам" :height="DOUGHNUT_HEIGHT" />
        </NuiCardContent>
      </NuiCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { countBy, sumBy, uniq } from 'lodash-es';
import { NuiChart, type ChartSpec } from '@numior/charts';
import {
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardHeader,
  NuiCardTitle,
} from '@numior/vue';
import { ORDER_STATUSES, orders } from '#demo/orders';

const DOUGHNUT_HEIGHT = 240;

const money = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

const total = sumBy(orders, (order) => order.total);
const counts = countBy(orders, (order) => order.status);
const kinds = uniq(orders.map((order) => order.status));

const facts = [
  { label: 'Выручка', value: money.format(total) },
  { label: 'Заказы', value: String(orders.length) },
  { label: 'На один заказ', value: money.format(total / orders.length) },
];

const revenue: ChartSpec = {
  kind: 'column',
  categories: { kind: 'time', values: orders.map((order) => Date.parse(order.date)) },
  series: [{ id: 'revenue', name: 'Выручка, ₽', values: orders.map((order) => order.total) }],
};

const statuses: ChartSpec = {
  kind: 'doughnut',
  categories: {
    kind: 'text',
    labels: kinds.map((status) => ORDER_STATUSES[status]),
  },
  series: [{ id: 'orders', name: 'Заказы', values: kinds.map((status) => counts[status] ?? 0) }],
};
</script>
