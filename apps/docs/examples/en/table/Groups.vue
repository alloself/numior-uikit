<template>
  <div class="flex flex-col gap-3">
    <NuiSelect v-model="grouping" :options="groupings" label="Grouping" class="max-w-xs" />
    <NuiTable
      v-model:group-by="groupBy"
      v-model:expanded="expanded"
      :columns="columns"
      :rows="orders"
      :get-key="keyOf"
      caption="Orders by group"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiSelect, type NuiOptionSource } from '@numior/vue';
import { NuiTable, type NuiTableColumnDef, type TableNodeId } from '@numior/table';

interface Order {
  readonly id: number;
  readonly customer: string;
  readonly city: string;
  readonly status: 'paid' | 'pending' | 'cancelled';
  readonly total: number;
}

const orders: Order[] = [
  {
    id: 20401,
    customer: 'Anna Titova',
    city: 'Berlin',
    status: 'paid',
    total: 12400,
  },
  {
    id: 20402,
    customer: 'Igor Belov',
    city: 'Prague',
    status: 'pending',
    total: 3150,
  },
  {
    id: 20403,
    customer: 'Maria Kim',
    city: 'Berlin',
    status: 'paid',
    total: 48900,
  },
  {
    id: 20404,
    customer: 'Oleg Smirnov',
    city: 'Vienna',
    status: 'cancelled',
    total: 990,
  },
  {
    id: 20405,
    customer: 'Dina Akhmetova',
    city: 'Prague',
    status: 'paid',
    total: 7600,
  },
  {
    id: 20406,
    customer: 'Peter Volkov',
    city: 'Vienna',
    status: 'paid',
    total: 15300,
  },
  {
    id: 20407,
    customer: 'Lena Orlova',
    city: 'Berlin',
    status: 'pending',
    total: 2200,
  },
  {
    id: 20408,
    customer: 'Timur Saidov',
    city: 'Prague',
    status: 'paid',
    total: 31800,
  },
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

const columns: NuiTableColumnDef<Order>[] = [
  {
    key: 'id',
    label: '#',
    type: 'number',
    width: 96,
    value: (row) => row.id,
    format: (value) => String(value),
  },
  {
    key: 'buyer',
    label: 'Buyer',
    children: [
      {
        key: 'customer',
        label: 'Customer',
        type: 'text',
        width: 150,
        flex: 1,
        value: (row) => row.customer,
      },
      { key: 'city', label: 'City', type: 'text', width: 120, value: (row) => row.city },
    ],
  },
  {
    key: 'order',
    label: 'Order',
    children: [
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
        width: 130,
        aggregate: 'sum',
        value: (row) => row.total,
        format: (value) => money.format(value),
      },
    ],
  },
];

const groupings: NuiOptionSource<string> = [
  { value: 'none', label: 'No grouping' },
  { value: 'status', label: 'By status' },
  { value: 'city', label: 'By city' },
];

const keyOf = (order: Order): number => order.id;
const groupBy = ref<string[]>(['status']);
const expanded = ref<TableNodeId[]>([]);

const grouping = computed({
  get: (): string => groupBy.value[0] ?? 'none',
  set: (value: string | null) => {
    groupBy.value = value === null || value === 'none' ? [] : [value];
    expanded.value = [];
  },
});
</script>
