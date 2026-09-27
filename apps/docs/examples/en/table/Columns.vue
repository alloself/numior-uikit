<template>
  <NuiTable
    v-model:column-order="order"
    v-model:widths="widths"
    :columns="resizable"
    :rows="orders"
    :get-key="keyOf"
    caption="Columns can be resized and reordered"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTable, type NuiTableColumn } from '@numior/vue';

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

const columns: NuiTableColumn<Order>[] = [
  { key: 'id', label: 'No.', width: 96, sortable: true },
  { key: 'customer', label: 'Customer', sortable: true },
  { key: 'status', label: 'Status', width: 140 },
  { key: 'total', label: 'Total, €', align: 'end', width: 128, sortable: true },
  { key: 'date', label: 'Date', width: 128, sortable: true },
];

const keyOf = (order: Order): string => String(order.id);

const resizable: NuiTableColumn<Order>[] = columns.map((column) => ({
  ...column,
  resizable: true,
  reorderable: true,
}));

const order = ref(columns.map((column) => column.key));
const widths = ref<Record<string, number>>({});
</script>
