<template>
  <div class="flex flex-col gap-3">
    <NuiTable
      cell-selection
      v-model:ranges="ranges"
      :columns="columns"
      :rows="latest"
      :get-key="keyOf"
      :context-menu="menuOf"
      caption="Orders this week"
    />
    <p class="m-0 text-sm text-muted-foreground">{{ summary }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { plural } from '@numior/primitives';
import type { NuiMenuEntry } from '@numior/vue';
import {
  NuiTable,
  type NuiTableColumn,
  type NuiTableContextScope,
  type NuiTableRanges,
} from '@numior/table';
import { orders, type Order } from '#demo/orders';

const latest = orders.slice(0, 5);

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
const opened = ref<number>();

const cells = computed(() =>
  ranges.value.reduce(
    (sum, range) =>
      sum +
      (Math.abs(range.to.row - range.from.row) + 1) * (Math.abs(range.to.col - range.from.col) + 1),
    0,
  ),
);

const summary = computed(() => {
  const selection =
    cells.value === 0
      ? 'No cells selected.'
      : `${cells.value} ${plural('en', cells.value, { one: 'cell', other: 'cells' })} selected.`;

  return opened.value === undefined ? selection : `${selection} Order ${opened.value} is open.`;
});

const menuOf = (scope: NuiTableContextScope<Order>): NuiMenuEntry[] => [
  {
    label: `Open order ${scope.row.id}`,
    icon: 'external-link',
    onSelect: () => {
      opened.value = scope.row.id;
    },
  },
];
</script>
