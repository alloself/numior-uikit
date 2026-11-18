<template>
  <NuiCard>
    <NuiCardHeader>
      <NuiCardDescription>Revenue in two weeks</NuiCardDescription>
      <NuiCardTitle class="text-3xl">{{ money.format(total) }}</NuiCardTitle>
      <template #actions>
        <NuiBadge tone="success">{{ orders.length }} orders</NuiBadge>
      </template>
    </NuiCardHeader>
    <NuiCardContent>
      <NuiChart :spec="spec" label="Revenue by day" :height="HEIGHT" />
    </NuiCardContent>
  </NuiCard>
</template>

<script setup lang="ts">
import { groupBy, sumBy } from 'lodash-es';
import { NuiChart, type ChartSpec } from '@numior/kit/charts';
import {
  NuiBadge,
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardHeader,
  NuiCardTitle,
} from '@numior/kit';
import { orders } from '#demo/orders';

const HEIGHT = 160;

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const total = sumBy(orders, (order) => order.total);
const byDay = groupBy(orders, (order) => order.date);
const days = Object.keys(byDay).toSorted();

const spec: ChartSpec = {
  kind: 'area',
  categories: { kind: 'time', values: days.map((day) => Date.parse(day)) },
  series: [
    {
      id: 'revenue',
      name: 'Revenue, $',
      values: days.map((day) => sumBy(byDay[day], (order) => order.total)),
    },
  ],
};
</script>
