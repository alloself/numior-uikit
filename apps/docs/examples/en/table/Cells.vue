<template>
  <div class="flex flex-col gap-3">
    <NuiTable
      v-model:selected="selected"
      :columns="columns"
      :rows="orders"
      :get-key="keyOf"
      selectable="multiple"
      caption="Orders to ship"
    >
      <template #cell-status="{ row }">
        <NuiBadge :tone="toneOf(row)" size="sm">{{ statusOf(row) }}</NuiBadge>
      </template>
    </NuiTable>
    <p class="text-sm text-muted-foreground">Selected: {{ selected.length }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiBadge, type NuiTone } from '@numior/vue';
import { NuiTable, type NuiTableColumn } from '@numior/table';

interface Order {
  readonly id: number;
  readonly customer: string;
  readonly status: 'paid' | 'pending' | 'cancelled';
  readonly total: number;
}

const orders: Order[] = [
  { id: 20419, customer: 'Anna Titova', status: 'paid', total: 12400 },
  { id: 20420, customer: 'Igor Belov', status: 'pending', total: 3150 },
  { id: 20421, customer: 'Maria Kim', status: 'paid', total: 48900 },
  { id: 20422, customer: 'Oleg Smirnov', status: 'cancelled', total: 990 },
  { id: 20423, customer: 'Dina Akhmetova', status: 'paid', total: 7600 },
];

const TONES: Record<Order['status'], NuiTone> = {
  paid: 'success',
  pending: 'warning',
  cancelled: 'neutral',
};

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
    width: 160,
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
];

const keyOf = (order: Order): number => order.id;
const toneOf = (order: Order): NuiTone => TONES[order.status];
const statusOf = (order: Order): string => STATUSES[order.status];
const selected = ref<Order[]>([]);
</script>
