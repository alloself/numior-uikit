<template>
  <NuiTable
    v-model:sort="sort"
    :columns="columns"
    :rows="orders"
    :get-key="keyOf"
    caption="Заказы за неделю"
    striped
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTable, type NuiTableColumn, type TableSort } from '@numior/table';

interface Order {
  readonly id: number;
  readonly customer: string;
  readonly status: 'paid' | 'pending' | 'cancelled';
  readonly total: number;
  readonly date: string;
}

const orders: Order[] = [
  { id: 20419, customer: 'Анна Титова', status: 'paid', total: 12400, date: '2026-09-21' },
  { id: 20420, customer: 'Игорь Белов', status: 'pending', total: 3150, date: '2026-09-22' },
  { id: 20421, customer: 'Мария Ким', status: 'paid', total: 48900, date: '2026-09-23' },
  { id: 20422, customer: 'Олег Смирнов', status: 'cancelled', total: 990, date: '2026-09-24' },
  { id: 20423, customer: 'Дина Ахметова', status: 'paid', total: 7600, date: '2026-09-25' },
];

const STATUSES: Record<Order['status'], string> = {
  paid: 'Оплачен',
  pending: 'Ждёт оплаты',
  cancelled: 'Отменён',
};

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
    value: (row) => row.id,
    format: (value) => String(value),
  },
  {
    key: 'customer',
    label: 'Клиент',
    type: 'text',
    width: 160,
    flex: 1,
    value: (row) => row.customer,
  },
  {
    key: 'status',
    label: 'Статус',
    type: 'text',
    width: 120,
    value: (row) => STATUSES[row.status],
  },
  {
    key: 'total',
    label: 'Сумма',
    type: 'number',
    width: 110,
    value: (row) => row.total,
    format: (value) => money.format(value),
  },
  { key: 'date', label: 'Дата', type: 'date', width: 140, value: (row) => Date.parse(row.date) },
];

const keyOf = (order: Order): number => order.id;
const sort = ref<TableSort[]>([{ key: 'date', direction: 'desc' }]);
</script>
