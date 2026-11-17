<template>
  <NuiTable
    v-model:page-size="pageSize"
    :columns="columns"
    :rows="orders"
    :get-key="keyOf"
    :pagination="{ pageSizes: [5, 10, 20] }"
    caption="Все заказы"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTable, type NuiTableColumn } from '@numior/kit/table';
import { ordersOf } from '#demo/many-orders';
import type { Order } from '#demo/orders';

const orders = ordersOf(42);

const money = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

const columns: NuiTableColumn<Order>[] = [
  {
    key: 'id',
    label: '№',
    type: 'number',
    width: 96,
    value: (row) => row.id,
    format: (value) => String(value),
  },
  {
    key: 'customer',
    label: 'Клиент',
    type: 'text',
    width: 200,
    flex: 1,
    value: (row) => row.customer,
  },
  {
    key: 'total',
    label: 'Сумма',
    type: 'number',
    width: 140,
    value: (row) => row.total,
    format: (value) => money.format(value),
  },
];

const keyOf = (order: Order): number => order.id;
const pageSize = ref(10);
</script>
