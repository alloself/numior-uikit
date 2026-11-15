<template>
  <div class="flex flex-col gap-3">
    <NuiTable
      v-model:selected="selected"
      :columns="columns"
      :rows="latest"
      :get-key="keyOf"
      selectable="multiple"
      caption="New orders"
    >
      <template #cell-status="{ row }">
        <NuiBadge :tone="toneOf(row)" size="sm">{{ statusOf(row) }}</NuiBadge>
      </template>
    </NuiTable>
    <p class="m-0 text-sm text-muted-foreground">{{ summary }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { plural } from '@numior/primitives';
import { NuiBadge, type NuiTone } from '@numior/vue';
import { NuiTable, type NuiTableColumn } from '@numior/table';
import { ORDER_STATUSES, orders, type Order, type OrderStatus } from '#demo/orders';

const latest = orders.slice(-5);

const TONES: Record<OrderStatus, NuiTone> = {
  pending: 'warning',
  paid: 'info',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'neutral',
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
    value: (row) => ORDER_STATUSES[row.status],
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
const statusOf = (order: Order): string => ORDER_STATUSES[order.status];
const selected = ref<Order[]>([]);

const summary = computed(() => {
  const count = selected.value.length;

  if (count === 0) {
    return 'No orders picked to ship.';
  }

  const sum = selected.value.reduce((total, order) => total + order.total, 0);

  return `${count} ${plural('en', count, { one: 'order', other: 'orders' })} to ship, ${money.format(sum)} in total.`;
});
</script>
