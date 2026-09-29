<template>
  <div class="flex flex-col gap-3">
    <NuiInput
      v-model="quick"
      type="search"
      placeholder="Search orders"
      aria-label="Search orders"
      class="max-w-xs"
    />
    <NuiTable
      v-model:filters="filters"
      v-model:quick="quick"
      :columns="columns"
      :rows="orders"
      :get-key="keyOf"
      totals-label="Total"
      caption="Orders of the month"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiInput } from '@numior/vue';
import { NuiTable, type NuiTableColumn, type NuiTableFilters } from '@numior/table';

interface Order {
  readonly id: number;
  readonly customer: string;
  readonly city: string;
  readonly status: 'paid' | 'pending' | 'cancelled';
  readonly total: number;
}

const orders: Order[] = [
  { id: 20401, customer: 'Anna Titova', city: 'Berlin', status: 'paid', total: 12400 },
  { id: 20402, customer: 'Igor Belov', city: 'Prague', status: 'pending', total: 3150 },
  { id: 20403, customer: 'Maria Kim', city: 'Berlin', status: 'paid', total: 48900 },
  { id: 20404, customer: 'Oleg Smirnov', city: 'Vienna', status: 'cancelled', total: 990 },
  { id: 20405, customer: 'Dina Akhmetova', city: 'Prague', status: 'paid', total: 7600 },
  { id: 20406, customer: 'Peter Volkov', city: 'Vienna', status: 'paid', total: 15300 },
  { id: 20407, customer: 'Lena Orlova', city: 'Berlin', status: 'pending', total: 2200 },
  { id: 20408, customer: 'Timur Saidov', city: 'Prague', status: 'paid', total: 31800 },
  { id: 20409, customer: 'Vera Lapina', city: 'Vienna', status: 'cancelled', total: 1450 },
  { id: 20410, customer: 'Gleb Nosov', city: 'Berlin', status: 'paid', total: 9900 },
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
    filter: false,
    value: (row) => row.id,
    format: (value) => String(value),
  },
  {
    key: 'customer',
    label: 'Customer',
    type: 'text',
    width: 180,
    flex: 1,
    value: (row) => row.customer,
  },
  {
    key: 'city',
    label: 'City',
    type: 'text',
    width: 130,
    filter: 'set',
    value: (row) => row.city,
  },
  {
    key: 'status',
    label: 'Status',
    type: 'text',
    width: 150,
    filter: 'set',
    value: (row) => STATUSES[row.status],
  },
  {
    key: 'total',
    label: 'Total',
    type: 'number',
    width: 140,
    aggregate: 'sum',
    value: (row) => row.total,
    format: (value) => money.format(value),
  },
];

const keyOf = (order: Order): number => order.id;
const quick = ref('');
const filters = ref<NuiTableFilters>([]);
</script>
