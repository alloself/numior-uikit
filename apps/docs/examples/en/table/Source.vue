<template>
  <div class="flex flex-col gap-3">
    <NuiInput
      v-model="quick"
      type="search"
      size="sm"
      class="max-w-64"
      placeholder="Search customers"
      aria-label="Search customers"
    />
    <NuiTable
      v-model:quick="quick"
      :columns="columns"
      :source="source"
      :get-key="keyOf"
      caption="Orders on the server"
      height="20rem"
    />
    <p class="text-sm text-muted-foreground">Server requests: {{ requests }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiInput } from '@numior/vue';
import {
  NuiTable,
  type NuiTableColumn,
  type TableFilter,
  type TableSort,
  type TableSource,
} from '@numior/table';

interface Order {
  readonly id: number;
  readonly customer: string;
  readonly amount: number;
}

const NAMES = ['Anna Titova', 'Igor Belov', 'Maria Kim', 'Oleg Smirnov', 'Vera Orlova'];

const orders: readonly Order[] = Array.from({ length: 20_000 }, (_, index) => ({
  id: index + 1,
  customer: NAMES[index % NAMES.length] ?? '',
  amount: ((index * 7919) % 50_000) + 500,
}));

const SIGN = { asc: 1, desc: -1 } as const;

const NO_ORDER: TableSort = { key: '', direction: 'asc' };

const compare: Readonly<Record<string, (a: Order, b: Order) => number>> = {
  id: (a, b) => a.id - b.id,
  customer: (a, b) => a.customer.localeCompare(b.customer),
  amount: (a, b) => a.amount - b.amount,
};

const isQuick = (filter: TableFilter): filter is Extract<TableFilter, { kind: 'quick' }> =>
  filter.kind === 'quick';

const found = (filters: readonly TableFilter[]): readonly Order[] => {
  const text = filters.find(isQuick)?.value.toLowerCase() ?? '';

  return orders.filter((order) => order.customer.toLowerCase().includes(text));
};

const sorted = (rows: readonly Order[], sort: readonly TableSort[]): readonly Order[] => {
  const [order = NO_ORDER] = sort;
  const by = compare[order.key];

  return by === undefined ? rows : rows.toSorted((a, b) => by(a, b) * SIGN[order.direction]);
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

const requests = ref(0);
const quick = ref('');

const source: TableSource<Order> = {
  fetch: async ({ offset, limit, sort, filters, signal }) => {
    requests.value += 1;
    await wait(signal);

    const rows = sorted(found(filters), sort);

    return { rows: rows.slice(offset, offset + limit), total: rows.length };
  },
};

const columns: NuiTableColumn<Order>[] = [
  {
    key: 'id',
    label: '№',
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
    width: 200,
    flex: 1,
    filter: false,
    value: (row) => row.customer,
  },
  {
    key: 'amount',
    label: 'Amount',
    type: 'number',
    width: 140,
    filter: false,
    value: (row) => row.amount,
  },
];

const keyOf = (order: Order): number => order.id;
</script>
