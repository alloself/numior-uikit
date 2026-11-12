<template>
  <div class="flex flex-col gap-4 p-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div class="flex flex-col gap-1">
        <h1 class="m-0 text-xl font-semibold tracking-tight">Orders</h1>
        <p class="m-0 text-sm text-muted-foreground">Every store order of the last six months</p>
      </div>
      <div class="grid w-full gap-2 sm:w-auto sm:grid-cols-[16rem_11rem]">
        <NuiInput
          v-model="quick"
          type="search"
          placeholder="Customer, city or number"
          aria-label="Search orders"
        />
        <NuiSelect
          v-model="status"
          :options="statuses"
          placeholder="Any status"
          aria-label="Order status"
          clearable
        />
      </div>
    </div>
    <NuiTable
      v-model:quick="quick"
      v-model:page-size="pageSize"
      :columns="columns"
      :rows="rows"
      :get-key="keyOf"
      :pagination="{ pageSizes: [10, 20, 50] }"
      label="Orders"
    >
      <template #cell-status="{ row }">
        <NuiBadge :tone="STATUS_TONES[row.status]" size="sm">
          {{ ORDER_STATUSES[row.status] }}
        </NuiBadge>
      </template>
    </NuiTable>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiBadge, NuiInput, NuiSelect, type NuiTone } from '@numior/vue';
import { NuiTable, type NuiTableColumn } from '@numior/table';
import { ordersOf } from '#demo/many-orders';
import { ORDER_STATUSES, type Order, type OrderStatus } from '#demo/orders';

const STATUS_TONES: Record<OrderStatus, NuiTone> = {
  pending: 'warning',
  paid: 'info',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'neutral',
};

const all = ordersOf(240);

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const day = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' });

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
    key: 'date',
    label: 'Date',
    type: 'text',
    width: 110,
    value: (row) => row.date,
    format: (value) => day.format(new Date(value)),
  },
  {
    key: 'customer',
    label: 'Customer',
    type: 'text',
    width: 180,
    flex: 1,
    value: (row) => row.customer,
  },
  { key: 'city', label: 'City', type: 'text', width: 150, value: (row) => row.city },
  {
    key: 'status',
    label: 'Status',
    type: 'text',
    width: 140,
    value: (row) => ORDER_STATUSES[row.status],
  },
  {
    key: 'total',
    label: 'Total',
    type: 'number',
    width: 130,
    value: (row) => row.total,
    format: (value) => money.format(value),
  },
];

const statuses = Object.entries(ORDER_STATUSES).map(([value, label]) => ({ value, label }));

const quick = ref('');
const status = ref<string | null>(null);
const pageSize = ref(10);

const rows = computed(() =>
  status.value === null ? all : all.filter((order) => order.status === status.value),
);

const keyOf = (order: Order): number => order.id;
</script>
