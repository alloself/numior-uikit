<template>
  <div class="flex flex-col gap-3">
    <NuiTable
      v-model:group-by="groupBy"
      v-model:expanded="expanded"
      :columns="columns"
      :source="source"
      :get-key="keyOf"
      caption="Заказы по городам"
      height="20rem"
    />
    <p class="text-sm text-muted-foreground">Запросов к серверу: {{ requests }}</p>
  </div>
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

interface Order {
  readonly id: number;
  readonly customer: string;
  readonly city: string;
  readonly amount: number;
}

const CITIES = ['Москва', 'Казань', 'Ереван', 'Минск'];
const NAMES = ['Анна Титова', 'Игорь Белов', 'Мария Ким', 'Олег Смирнов', 'Вера Орлова'];

const orders: readonly Order[] = Array.from({ length: 20_000 }, (_, index) => ({
  id: index + 1,
  customer: NAMES[index % NAMES.length] ?? '',
  city: CITIES[(index * 3) % CITIES.length] ?? '',
  amount: ((index * 7919) % 50_000) + 500,
}));

const VALUES: Readonly<Record<string, (order: Order) => string>> = {
  city: (order) => order.city,
  customer: (order) => order.customer,
};

const valueOf = (order: Order, key: string | undefined): string => VALUES[key ?? '']?.(order) ?? '';

const groupsOf = (rows: readonly Order[], key: string): TableSourceGroup[] => {
  const groups = new Map<string, { count: number; amount: number }>();

  for (const row of rows) {
    const value = valueOf(row, key);
    const group = groups.get(value) ?? { count: 0, amount: 0 };

    groups.set(value, { count: group.count + 1, amount: group.amount + row.amount });
  }
  return [...groups].map(([value, { count, amount }]) => ({
    value,
    count,
    aggregates: { amount },
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

const total = orders.reduce((sum, order) => sum + order.amount, 0);
const requests = ref(0);
const groupBy = ref<readonly string[]>(['city']);
const expanded = ref<readonly TableNodeId[]>([]);

const source: TableSource<Order> = {
  fetch: async ({ offset, limit, groupBy: keys, groupPath, signal }) => {
    requests.value += 1;
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
    return { amount: total };
  },
};

const columns: NuiTableColumn<Order>[] = [
  {
    key: 'id',
    label: '№',
    type: 'number',
    width: 96,
    sortable: false,
    filter: false,
    value: (row) => row.id,
    format: (value) => String(value),
  },
  {
    key: 'customer',
    label: 'Клиент',
    type: 'text',
    width: 200,
    flex: 1,
    sortable: false,
    filter: false,
    value: (row) => row.customer,
  },
  {
    key: 'city',
    label: 'Город',
    type: 'text',
    width: 140,
    sortable: false,
    filter: false,
    value: (row) => row.city,
  },
  {
    key: 'amount',
    label: 'Сумма',
    type: 'number',
    width: 140,
    sortable: false,
    filter: false,
    aggregate: 'sum',
    value: (row) => row.amount,
  },
];

const keyOf = (order: Order): number => order.id;
</script>
