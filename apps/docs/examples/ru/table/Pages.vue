<template>
  <NuiTable
    :columns="columns"
    :rows="orders"
    :get-key="keyOf"
    :pagination="{ pageSizes: [5, 10, 20] }"
    caption="Все заказы"
  />
</template>

<script setup lang="ts">
import { NuiTable, type NuiTableColumn } from '@numior/vue';

interface Order {
  readonly id: number;
  readonly customer: string;
  readonly total: number;
}

const names = ['Анна Титова', 'Игорь Белов', 'Мария Ким', 'Олег Смирнов', 'Дина Ахметова'];

const orders: Order[] = Array.from({ length: 42 }, (_, index) => ({
  id: 20400 + index,
  customer: names[index % names.length] ?? '',
  total: 900 + index * 350,
}));

const columns: NuiTableColumn<Order>[] = [
  { key: 'id', label: '№', width: 96 },
  { key: 'customer', label: 'Клиент' },
  { key: 'total', label: 'Сумма, ₽', align: 'end', width: 128 },
];

const keyOf = (order: Order): string => String(order.id);
</script>
