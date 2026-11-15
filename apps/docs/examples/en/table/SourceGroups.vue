<template>
  <NuiTable
    v-model:group-by="groupBy"
    v-model:expanded="expanded"
    :columns="columns"
    :source="source"
    :get-key="keyOf"
    caption="Orders by city"
    height="20rem"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiTable,
  type NuiTableColumn,
  type TableNodeId,
  type TableSource,
  type TableSourceGroup,
} from '@numior/table';
import { ordersOf } from '#demo/many-orders';
import type { Order } from '#demo/orders';

const orders = ordersOf(20_000);

const VALUES: Readonly<Record<string, (order: Order) => string>> = {
  city: (order) => order.city,
  customer: (order) => order.customer,
};

const valueOf = (order: Order, key: string | undefined): string => VALUES[key ?? '']?.(order) ?? '';

const groupsOf = (rows: readonly Order[], key: string): TableSourceGroup[] => {
  const groups = new Map<string, { count: number; total: number }>();

  for (const row of rows) {
    const value = valueOf(row, key);
    const group = groups.get(value) ?? { count: 0, total: 0 };

    groups.set(value, { count: group.count + 1, total: group.total + row.total });
  }
  return [...groups].map(([value, { count, total }]) => ({
    value,
    count,
    aggregates: { total },
  }));
};

const wait = (signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, 300);

    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });

const sum = orders.reduce((total, order) => total + order.total, 0);
const groupBy = ref<readonly string[]>(['city']);
const expanded = ref<readonly TableNodeId[]>([]);

const source: TableSource<Order> = {
  fetch: async ({ offset, limit, groupBy: keys, groupPath, signal }) => {
    await wait(signal);

    const inside = orders.filter((order) =>
      groupPath.every((value, depth) => valueOf(order, keys[depth]) === value),
    );

    const level = keys[groupPath.length];

    return level === undefined
      ? { rows: inside.slice(offset, offset + limit), total: inside.length }
      : { groups: groupsOf(inside, level) };
  },
  totals: async ({ signal }) => {
    await wait(signal);
    return { total: sum };
  },
};

const columns: NuiTableColumn<Order>[] = [
  {
    key: 'id',
    label: '#',
    type: 'number',
    width: 96,
    sortable: false,
    filter: false,
    value: (row) => row.id,
    format: (value) => String(value),
  },
  {
    key: 'customer',
    label: 'Customer',
    type: 'text',
    width: 200,
    flex: 1,
    sortable: false,
    filter: false,
    value: (row) => row.customer,
  },
  {
    key: 'city',
    label: 'City',
    type: 'text',
    width: 140,
    sortable: false,
    filter: false,
    value: (row) => row.city,
  },
  {
    key: 'total',
    label: 'Amount',
    type: 'number',
    width: 140,
    sortable: false,
    filter: false,
    aggregate: 'sum',
    value: (row) => row.total,
  },
];

const keyOf = (order: Order): number => order.id;
</script>
