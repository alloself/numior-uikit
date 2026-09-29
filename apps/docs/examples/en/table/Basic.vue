<template>
  <NuiTable
    v-model:sort="sort"
    :columns="columns"
    :rows="orders"
    :get-key="keyOf"
    caption="Orders of the week"
    striped
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTable, type NuiTableColumn, type TableSort } from '@numior/table';

interface Order {
  readonly id: number;
  readonly customer: string;
  readonly status: 'paid' | 'pending' | 'cancelled';
  readonly total: number;
  readonly date: string;
}

const orders: Order[] = [
  { id: 20419, customer: 'Anna Titova', status: 'paid', total: 12400, date: '2026-09-21' },
  { id: 20420, customer: 'Igor Belov', status: 'pending', total: 3150, date: '2026-09-22' },
  { id: 20421, customer: 'Maria Kim', status: 'paid', total: 48900, date: '2026-09-23' },
  { id: 20422, customer: 'Oleg Smirnov', status: 'cancelled', total: 990, date: '2026-09-24' },
  { id: 20423, customer: 'Dina Akhmetova', status: 'paid', total: 7600, date: '2026-09-25' },
];

const STATUSES: Record<Order['status'], string> = {
  paid: 'Paid',
  pending: 'Awaiting payment',
  cancelled: 'Cancelled',
};

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
    width: 200,
    flex: 1,
    value: (row) => row.customer,
  },
  {
    key: 'status',
    label: 'Status',
    type: 'text',
    width: 140,
    value: (row) => STATUSES[row.status],
  },
  {
    key: 'total',
    label: 'Total',
    type: 'number',
    width: 140,
    value: (row) => row.total,
    format: (value) => money.format(value),
  },
  { key: 'date', label: 'Date', type: 'date', width: 140, value: (row) => Date.parse(row.date) },
];

const keyOf = (order: Order): number => order.id;
const sort = ref<TableSort[]>([{ key: 'date', direction: 'desc' }]);
</script>
