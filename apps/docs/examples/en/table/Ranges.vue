<template>
  <div class="flex flex-col gap-3">
    <NuiTable
      v-model:ranges="ranges"
      :columns="columns"
      :rows="orders"
      :get-key="keyOf"
      :context-menu="menuOf"
      caption="Orders this week"
    />
    <p class="text-sm text-muted-foreground">
      Cells selected: {{ cells }}. Opened order: {{ opened }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { NuiMenuEntry } from '@numior/vue';
import {
  NuiTable,
  type NuiTableColumn,
  type NuiTableContextScope,
  type NuiTableRanges,
} from '@numior/table';

interface Order {
  readonly id: number;
  readonly customer: string;
  readonly city: string;
  readonly total: number;
}

const orders: Order[] = [
  { id: 20419, customer: 'Anna Titova', city: 'Moscow', total: 12400 },
  { id: 20420, customer: 'Igor Belov', city: 'Kazan', total: 3150 },
  { id: 20421, customer: 'Maria Kim', city: 'Moscow', total: 48900 },
  { id: 20422, customer: 'Oleg Smirnov', city: 'Tver', total: 990 },
  { id: 20423, customer: 'Dina Akhmetova', city: 'Kazan', total: 7600 },
];

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
  { key: 'city', label: 'City', type: 'text', width: 120, value: (row) => row.city },
  {
    key: 'total',
    label: 'Total',
    type: 'number',
    width: 120,
    value: (row) => row.total,
    format: (value) => money.format(value),
  },
];

const keyOf = (order: Order): number => order.id;
const ranges = ref<NuiTableRanges>([]);
const opened = ref('—');

const cells = computed(() =>
  ranges.value.reduce(
    (sum, range) =>
      sum +
      (Math.abs(range.to.row - range.from.row) + 1) * (Math.abs(range.to.col - range.from.col) + 1),
    0,
  ),
);

const menuOf = (scope: NuiTableContextScope<Order>): NuiMenuEntry[] => [
  {
    label: `Open order ${scope.row.id}`,
    onSelect: () => {
      opened.value = String(scope.row.id);
    },
  },
];
</script>
