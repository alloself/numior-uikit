<template>
  <NuiList variant="outline" label="Последние заказы" class="w-full max-w-sm">
    <NuiListItem
      v-for="order in latest"
      :key="order.id"
      :icon="Package"
      :label="`Заказ ${order.id}`"
      :description="`${order.customer}, ${money.format(order.total)}`"
      :href="`#order-${order.id}`"
    />
  </NuiList>
</template>

<script setup lang="ts">
import { Package } from '@lucide/vue';
import { NuiList, NuiListItem } from '@numior/kit';
import { orders } from '#demo/orders';

const money = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

const latest = orders.slice(-3).toReversed();
</script>
