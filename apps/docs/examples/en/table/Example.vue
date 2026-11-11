<template>
  <NuiTable :columns="columns" :rows="latest" :get-key="keyOf" />
</template>

<script setup lang="ts">
import { NuiTable, type NuiTableColumn } from '@numior/table';
import { ORDER_STATUSES, orders, type Order } from '#demo/orders';

const latest = orders.slice(-6);

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
  { key: 'total', label: 'Total, $', type: 'number', width: 110, value: (row) => row.total },
];

const keyOf = (order: Order): number => order.id;
</script>
