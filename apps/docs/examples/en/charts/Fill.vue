<template>
  <div class="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
    <NuiCard>
      <NuiCardHeader>
        <NuiCardTitle>Last 30 days</NuiCardTitle>
      </NuiCardHeader>
      <NuiCardContent>
        <dl class="m-0 flex flex-col gap-4">
          <div v-for="fact in facts" :key="fact.term" class="flex flex-col gap-1">
            <dt class="text-muted-foreground">{{ fact.term }}</dt>
            <dd class="m-0 text-2xl font-semibold tabular-nums">{{ fact.value }}</dd>
          </div>
        </dl>
      </NuiCardContent>
    </NuiCard>
    <NuiCard class="md:col-span-2">
      <NuiCardHeader>
        <NuiCardTitle>Revenue by day</NuiCardTitle>
      </NuiCardHeader>
      <NuiCardContent class="min-h-60 flex-1">
        <NuiChart :spec="revenue" label="Revenue by day" height="fill" />
      </NuiCardContent>
    </NuiCard>
  </div>
</template>

<script setup lang="ts">
import { groupBy, range, sumBy } from 'lodash-es';
import { NuiChart, type ChartSpec } from '@numior/kit/charts';
import { NuiCard, NuiCardContent, NuiCardHeader, NuiCardTitle } from '@numior/kit';
import { ordersOf } from '#demo/many-orders';

const DAYS = 30;
const DAY = 86_400_000;

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const orders = ordersOf(600);
const latest = Math.max(...orders.map((order) => Date.parse(order.date)));
const days = range(latest - (DAYS - 1) * DAY, latest + DAY, DAY);
const byDay = groupBy(orders, (order) => Date.parse(order.date));
const recent = days.flatMap((day) => byDay[day] ?? []);
const total = sumBy(recent, (order) => order.total);

const facts = [
  { term: 'Revenue', value: money.format(total) },
  { term: 'Orders', value: String(recent.length) },
  { term: 'Per order', value: money.format(total / recent.length) },
];

const revenue: ChartSpec = {
  kind: 'column',
  categories: { kind: 'time', values: days },
  series: [
    {
      id: 'revenue',
      name: 'Revenue, $',
      values: days.map((day) => sumBy(byDay[day], (order) => order.total)),
    },
  ],
};
</script>
