<template>
  <NuiChart :spec="revenue" label="Revenue by month" :height="HEIGHT" class="w-full">
    <template #tooltip="{ hit, content }">
      <p class="m-0 mb-1 font-medium">{{ content.title }}</p>
      <dl class="m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
        <template v-for="fact in months[hit.index]?.facts" :key="fact.term">
          <dt class="text-muted-foreground">{{ fact.term }}</dt>
          <dd class="m-0 text-end font-medium tabular-nums">{{ fact.value }}</dd>
        </template>
      </dl>
    </template>
  </NuiChart>
</template>

<script setup lang="ts">
import { groupBy, sortBy, sumBy, upperFirst } from 'lodash-es';
import { NuiChart, type ChartSpec } from '@numior/charts';
import { monthKeyOf } from '@numior/primitives';
import { ordersOf } from '#demo/many-orders';

const HEIGHT = 260;

const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' });

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const months = sortBy(
  Object.entries(groupBy(ordersOf(600), (order) => monthKeyOf(order.date))),
  ([key]) => key,
).map(([key, orders]) => {
  const total = sumBy(orders, (order) => order.total);

  return {
    name: upperFirst(monthName.format(Date.parse(key))),
    total,
    facts: [
      { term: 'Revenue', value: money.format(total) },
      { term: 'Orders', value: String(orders.length) },
      { term: 'Per order', value: money.format(total / orders.length) },
    ],
  };
});

const revenue: ChartSpec = {
  kind: 'column',
  categories: { kind: 'text', labels: months.map((month) => month.name) },
  series: [{ id: 'revenue', name: 'Revenue, $', values: months.map((month) => month.total) }],
};
</script>
