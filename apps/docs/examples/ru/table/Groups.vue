<template>
  <div class="flex flex-col gap-3">
    <NuiSelect v-model="grouping" :options="groupings" label="Группировка" class="max-w-xs" />
    <NuiTable
      v-model:group-by="groupBy"
      v-model:expanded="expanded"
      :columns="columns"
      :rows="orders"
      :get-key="keyOf"
      caption="Заказы по группам"
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
  readonly date: string;
}

const orders: Order[] = [
  {
    id: 20401,
    customer: 'Анна Титова',
    city: 'Москва',
    status: 'paid',
    total: 12400,
    date: '2026-09-01',
  },
  {
    id: 20402,
    customer: 'Игорь Белов',
    city: 'Казань',
    status: 'pending',
    total: 3150,
    date: '2026-09-03',
  },
  {
    id: 20403,
    customer: 'Мария Ким',
    city: 'Москва',
    status: 'paid',
    total: 48900,
    date: '2026-09-05',
  },
  {
    id: 20404,
    customer: 'Олег Смирнов',
    city: 'Тверь',
    status: 'cancelled',
    total: 990,
    date: '2026-09-08',
  },
  {
    id: 20405,
    customer: 'Дина Ахметова',
    city: 'Казань',
    status: 'paid',
    total: 7600,
    date: '2026-09-11',
  },
  {
    id: 20406,
    customer: 'Пётр Волков',
    city: 'Тверь',
    status: 'paid',
    total: 15300,
    date: '2026-09-14',
  },
  {
    id: 20407,
    customer: 'Лена Орлова',
    city: 'Москва',
    status: 'pending',
    total: 2200,
    date: '2026-09-18',
  },
  {
    id: 20408,
    customer: 'Тимур Саидов',
    city: 'Казань',
    status: 'paid',
    total: 31800,
    date: '2026-09-22',
  },
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

const columns: NuiTableColumnDef<Order>[] = [
  {
    key: 'id',
    label: '№',
    type: 'number',
    width: 96,
    value: (row) => row.id,
    format: (value) => String(value),
  },
  {
    key: 'buyer',
    label: 'Покупатель',
    children: [
      {
        key: 'customer',
        label: 'Клиент',
        type: 'text',
        width: 180,
        flex: 1,
        value: (row) => row.customer,
      },
      { key: 'city', label: 'Город', type: 'text', width: 130, value: (row) => row.city },
    ],
  },
  {
    key: 'order',
    label: 'Заказ',
    children: [
      {
        key: 'status',
        label: 'Статус',
        type: 'text',
        width: 150,
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
      {
        key: 'date',
        label: 'Дата',
        type: 'date',
        width: 130,
        value: (row) => Date.parse(row.date),
      },
    ],
  },
];

const groupings: NuiOptionSource<string> = [
  { value: 'none', label: 'Без группировки' },
  { value: 'status', label: 'По статусу' },
  { value: 'city', label: 'По городу' },
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
