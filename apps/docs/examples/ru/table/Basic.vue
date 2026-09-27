<template>
  <NuiTable
    v-model:sort="sort"
    :columns="columns"
    :rows="orders"
    :get-key="keyOf"
    caption="Заказы за неделю"
    hoverable
    striped
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTable, type NuiTableColumn, type NuiTableSort } from '@numior/vue';

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

const columns: NuiTableColumn<Order>[] = [
  { key: 'id', label: '№', width: 96, sortable: true },
  { key: 'customer', label: 'Клиент', sortable: true },
  { key: 'status', label: 'Статус', width: 140 },
  { key: 'total', label: 'Сумма, ₽', align: 'end', width: 128, sortable: true },
  { key: 'date', label: 'Дата', width: 128, sortable: true },
];

const keyOf = (order: Order): string => String(order.id);

const sort = ref<NuiTableSort>({ key: 'date', direction: 'desc' });
</script>
