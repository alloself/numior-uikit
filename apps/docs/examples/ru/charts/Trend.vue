<template>
  <div class="flex w-full flex-col items-start gap-3">
    <NuiToggleGroup
      v-model="kind"
      :items="kinds"
      variant="segmented"
      required
      label="Вид графика"
    />
    <NuiChart :spec="spec" label="Выручка по дням" :height="HEIGHT" class="w-full" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { groupBy, range, sumBy } from 'lodash-es';
import { NuiChart, type ChartKind, type ChartSpec } from '@numior/charts';
import { NuiToggleGroup, type NuiToggleItem } from '@numior/vue';
import { ordersOf } from '#demo/many-orders';

const HEIGHT = 260;
const DAYS = 60;
const DAY = 86_400_000;

const kinds: readonly NuiToggleItem<ChartKind>[] = [
  { value: 'line', label: 'Линия' },
  { value: 'area', label: 'Область' },
];

const kind = ref<ChartKind | null>('line');

const orders = ordersOf(600);
const byDay = groupBy(orders, (order) => Date.parse(order.date));
const latest = Math.max(...orders.map((order) => Date.parse(order.date)));
const days = range(latest - (DAYS - 1) * DAY, latest + DAY, DAY);

const spec = computed((): ChartSpec => ({
  kind: kind.value ?? 'line',
  categories: { kind: 'time', values: days },
  series: [
    {
      id: 'revenue',
      name: 'Выручка, ₽',
      values: days.map((day) => sumBy(byDay[day], (order) => order.total)),
    },
  ],
}));
</script>
