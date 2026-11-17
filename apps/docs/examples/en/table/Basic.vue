<template>
  <NuiTable
    v-model:sort="sort"
    :columns="columns"
    :rows="latest"
    :get-key="keyOf"
    caption="Latest orders"
    striped
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTable, type NuiTableColumn, type TableSort } from '@numior/kit/table';
import { ORDER_STATUSES, orders, type Order } from '#demo/orders';

const latest = orders.slice(-6);

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const columns: NuiTableColumn<Order>[] = [
  {
    key: 'id',
    label: '#',
    type: 'number',
    width: 96,
    value: (row) => row.id,
    format: (value) => String(value),
  },
  {
    key: 'customer',
    label: 'Customer',
    type: 'text',
    width: 160,
    flex: 1,
    value: (row) => row.customer,
  },
  {
    key: 'status',
    label: 'Status',
    type: 'text',
    width: 120,
    value: (row) => ORDER_STATUSES[row.status],
  },
  {
    key: 'total',
    label: 'Total',
    type: 'number',
    width: 110,
    value: (row) => row.total,
    format: (value) => money.format(value),
  },
  { key: 'date', label: 'Date', type: 'date', width: 140, value: (row) => Date.parse(row.date) },
];

const keyOf = (order: Order): number => order.id;
const sort = ref<TableSort[]>([{ key: 'date', direction: 'desc' }]);
</script>
