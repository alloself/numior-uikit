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

interface Order {
  readonly id: number;
  readonly customer: string;
  readonly city: string;
  readonly status: 'paid' | 'pending' | 'cancelled';
  readonly total: number;
}

const orders: Order[] = [
  { id: 20401, customer: 'Анна Титова', city: 'Москва', status: 'paid', total: 12400 },
  { id: 20402, customer: 'Игорь Белов', city: 'Казань', status: 'pending', total: 3150 },
  { id: 20403, customer: 'Мария Ким', city: 'Москва', status: 'paid', total: 48900 },
  { id: 20404, customer: 'Олег Смирнов', city: 'Тверь', status: 'cancelled', total: 990 },
  { id: 20405, customer: 'Дина Ахметова', city: 'Казань', status: 'paid', total: 7600 },
  { id: 20406, customer: 'Пётр Волков', city: 'Тверь', status: 'paid', total: 15300 },
  { id: 20407, customer: 'Лена Орлова', city: 'Москва', status: 'pending', total: 2200 },
  { id: 20408, customer: 'Тимур Саидов', city: 'Казань', status: 'paid', total: 31800 },
  { id: 20409, customer: 'Вера Лапина', city: 'Тверь', status: 'cancelled', total: 1450 },
  { id: 20410, customer: 'Глеб Носов', city: 'Москва', status: 'paid', total: 9900 },
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
    filter: false,
    value: (row) => row.id,
    format: (value) => String(value),
  },
  {
    key: 'customer',
    label: 'Клиент',
    type: 'text',
    width: 180,
    flex: 1,
    value: (row) => row.customer,
  },
  {
    key: 'city',
    label: 'Город',
    type: 'text',
    width: 130,
    filter: 'set',
    value: (row) => row.city,
  },
  {
    key: 'status',
    label: 'Статус',
    type: 'text',
    width: 150,
    filter: 'set',
    value: (row) => STATUSES[row.status],
  },
  {
    key: 'total',
    label: 'Сумма',
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
