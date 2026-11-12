<template>
  <div class="flex w-full flex-col gap-4">
    <NuiChart
      v-model:selected="selected"
      :spec="revenue"
      label="Выручка по месяцам"
      :height="HEIGHT"
    />
    <p v-if="month === undefined" class="m-0 text-sm text-muted-foreground">
      Выберите месяц на графике
    </p>
    <div v-else class="flex flex-col gap-2">
      <p :id="headingId" class="m-0 text-sm font-medium">Крупные заказы за {{ month.name }}</p>
      <NuiList variant="bordered" :labelled-by="headingId">
        <NuiListItem
          v-for="order in largest"
          :key="order.id"
          :label="`№ ${order.id} · ${order.customer}`"
          :description="day.format(Date.parse(order.date))"
        >
          <template #trailing>
            <span class="text-sm font-medium">{{ money.format(order.total) }}</span>
          </template>
        </NuiListItem>
      </NuiList>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import { groupBy, orderBy, sortBy, sumBy, take, upperFirst } from 'lodash-es';
import { NuiChart, type ChartHit, type ChartSpec } from '@numior/charts';
import { monthKeyOf } from '@numior/primitives';
import { NuiList, NuiListItem } from '@numior/vue';
import { ordersOf } from '#demo/many-orders';

const HEIGHT = 240;
const SHOWN = 5;

const monthName = new Intl.DateTimeFormat('ru-RU', { month: 'long', timeZone: 'UTC' });
const day = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' });

const money = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

const months = sortBy(
  Object.entries(groupBy(ordersOf(600), (order) => monthKeyOf(order.date))),
  ([key]) => key,
).map(([key, orders]) => ({ name: monthName.format(Date.parse(key)), orders }));

const revenue: ChartSpec = {
  kind: 'column',
  categories: { kind: 'text', labels: months.map((month) => upperFirst(month.name)) },
  series: [
    {
      id: 'revenue',
      name: 'Выручка, ₽',
      values: months.map((month) => sumBy(month.orders, (order) => order.total)),
    },
  ],
};

const selected = ref<ChartHit | null>({ index: months.length - 1, series: undefined });
const headingId = useId();

const month = computed(() => (selected.value === null ? undefined : months[selected.value.index]));

const largest = computed(() =>
  take(orderBy(month.value?.orders, [(order) => order.total], ['desc']), SHOWN),
);
</script>
