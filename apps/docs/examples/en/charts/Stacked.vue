<template>
  <div class="flex w-full flex-col items-start gap-3">
    <NuiToggleGroup v-model="stacking" :items="views" variant="segmented" required label="Values" />
    <NuiChart :spec="spec" label="Orders by week and status" :height="HEIGHT" class="w-full" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { countBy, groupBy, sortBy, takeRight } from 'lodash-es';
import { NuiChart, type ChartSpec, type ChartStacking } from '@numior/kit/charts';
import { NuiToggleGroup, startOfWeek, type NuiToggleItem } from '@numior/kit';
import { ordersOf } from '#demo/many-orders';
import { ORDER_STATUSES } from '#demo/orders';

const HEIGHT = 280;
const WEEKS = 12;

const views: readonly NuiToggleItem<ChartStacking>[] = [
  { value: 'stacked', label: 'Count' },
  { value: 'percent', label: 'Share' },
];

const stacking = ref<ChartStacking | null>('stacked');

const weekStart = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

const byWeek = groupBy(ordersOf(600), (order) => startOfWeek(order.date, 1));
const weeks = takeRight(sortBy(Object.keys(byWeek)), WEEKS);
const counts = weeks.map((week) => countBy(byWeek[week], (order) => order.status));

const spec = computed((): ChartSpec => ({
  kind: 'column',
  stacking: stacking.value ?? 'stacked',
  categories: { kind: 'text', labels: weeks.map((week) => weekStart.format(Date.parse(week))) },
  series: Object.entries(ORDER_STATUSES).map(([status, name]) => ({
    id: status,
    name,
    values: counts.map((count) => count[status] ?? 0),
  })),
}));
</script>
