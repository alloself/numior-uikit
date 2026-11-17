<template>
  <NuiChart :spec="revenue" label="Выручка по месяцам" :height="HEIGHT" class="w-full" />
</template>

<script setup lang="ts">
import { groupBy, sortBy, sumBy, upperFirst } from 'lodash-es';
import { NuiChart, type ChartSpec } from '@numior/kit/charts';
import { monthKeyOf } from '@numior/kit';
import { ordersOf } from '#demo/many-orders';

const HEIGHT = 280;

const monthName = new Intl.DateTimeFormat('ru-RU', { month: 'long', timeZone: 'UTC' });
const byMonth = groupBy(ordersOf(600), (order) => monthKeyOf(order.date));
const months = sortBy(Object.keys(byMonth));

const revenue: ChartSpec = {
  kind: 'column',
  categories: {
    kind: 'text',
    labels: months.map((month) => upperFirst(monthName.format(Date.parse(month)))),
  },
  series: [
    {
      id: 'revenue',
      name: 'Выручка, ₽',
      values: months.map((month) => sumBy(byMonth[month], (order) => order.total)),
    },
  ],
};
</script>
