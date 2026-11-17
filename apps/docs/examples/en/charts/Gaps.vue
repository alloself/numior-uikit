<template>
  <div class="flex w-full flex-col items-start gap-3">
    <NuiToggleGroup
      v-model="gaps"
      :items="modes"
      variant="segmented"
      required
      label="Days without orders"
    />
    <NuiChart :spec="spec" label="Revenue per order by day" :height="HEIGHT" class="w-full" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { groupBy, meanBy, range } from 'lodash-es';
import { NuiChart, type ChartGaps, type ChartSpec, type ChartValue } from '@numior/kit/charts';
import { NuiToggleGroup, type NuiToggleItem } from '@numior/kit';
import { ordersOf } from '#demo/many-orders';
import type { Order } from '#demo/orders';

const HEIGHT = 260;
const DAYS = 30;
const DAY = 86_400_000;

const modes: readonly NuiToggleItem<ChartGaps>[] = [
  { value: 'break', label: 'Break' },
  { value: 'connect', label: 'Connect' },
];

const gaps = ref<ChartGaps | null>('break');

const averageOf = (placed: readonly Order[] | undefined): ChartValue =>
  placed === undefined ? null : Math.round(meanBy(placed, (order) => order.total));

const orders = ordersOf(300, 5);
const byDay = groupBy(orders, (order) => Date.parse(order.date));
const latest = Math.max(...orders.map((order) => Date.parse(order.date)));
const days = range(latest - (DAYS - 1) * DAY, latest + DAY, DAY);

const spec = computed((): ChartSpec => ({
  kind: 'line',
  gaps: gaps.value ?? 'break',
  categories: { kind: 'time', values: days },
  series: [
    { id: 'average', name: 'Per order, $', values: days.map((day) => averageOf(byDay[day])) },
  ],
}));
</script>
