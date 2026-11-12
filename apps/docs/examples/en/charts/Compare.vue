<template>
  <NuiChart :spec="revenue" label="Revenue by delivery method" :height="HEIGHT" class="w-full" />
</template>

<script setup lang="ts">
import { groupBy, sortBy, sumBy, upperFirst } from 'lodash-es';
import { NuiChart, type ChartSpec } from '@numior/charts';
import { monthKeyOf } from '@numior/primitives';
import { ordersOf } from '#demo/many-orders';
import { DELIVERIES } from '#demo/orders';

const HEIGHT = 280;

const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' });
const orders = ordersOf(600);
const months = sortBy(Object.keys(groupBy(orders, (order) => monthKeyOf(order.date))));
const byDelivery = groupBy(orders, (order) => order.delivery);

const revenue: ChartSpec = {
  kind: 'column',
  categories: {
    kind: 'text',
    labels: months.map((month) => upperFirst(monthName.format(Date.parse(month)))),
  },
  series: Object.entries(DELIVERIES).map(([delivery, name]) => {
    const byMonth = groupBy(byDelivery[delivery], (order) => monthKeyOf(order.date));

    return {
      id: delivery,
      name,
      values: months.map((month) => sumBy(byMonth[month], (order) => order.total)),
    };
  }),
};
</script>
