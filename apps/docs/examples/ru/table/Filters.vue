<template>
  <div class="flex flex-col gap-3">
    <NuiInput
      v-model="quick"
      type="search"
      placeholder="Поиск по заказам"
      aria-label="Поиск по заказам"
      class="max-w-xs"
    />
    <NuiTable
      v-model:filters="filters"
      v-model:quick="quick"
      :columns="columns"
      :rows="orders"
      :get-key="keyOf"
      totals-label="Итого"
      caption="Заказы за месяц"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiInput } from '@numior/vue';
import { NuiTable, type NuiTableColumn, type NuiTableFilters } from '@numior/table';
import { ORDER_STATUSES, orders, type Order } from '#demo/orders';

const money = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

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
    label: 'Клиент',
    type: 'text',
    width: 150,
    flex: 1,
    value: (row) => row.customer,
  },
  {
    key: 'city',
    label: 'Город',
    type: 'text',
    width: 120,
    filter: 'set',
    value: (row) => row.city,
  },
  {
    key: 'status',
    label: 'Статус',
    type: 'text',
    width: 140,
    filter: 'set',
    value: (row) => ORDER_STATUSES[row.status],
  },
  {
    key: 'total',
    label: 'Сумма',
    type: 'number',
    width: 130,
    aggregate: 'sum',
    value: (row) => row.total,
    format: (value) => money.format(value),
  },
];

const keyOf = (order: Order): number => order.id;
const quick = ref('');
const filters = ref<NuiTableFilters>([]);
</script>
