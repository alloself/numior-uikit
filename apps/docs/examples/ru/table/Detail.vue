<template>
  <NuiTable
    v-model:expanded="expanded"
    :columns="columns"
    :rows="latest"
    :get-key="keyOf"
    :has-detail="isActive"
    caption="Заказы и их состав"
  >
    <template #detail="{ row }">
      <div class="flex flex-col gap-3">
        <p class="text-sm text-muted-foreground">{{ deliveryOf(row) }}</p>
        <NuiTable
          :columns="lineColumns"
          :rows="row.lines"
          :get-key="skuOf"
          size="sm"
          label="Состав заказа"
          totals-label="Итого"
        />
      </div>
    </template>
  </NuiTable>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTable, type NuiTableColumn, type TableNodeId } from '@numior/table';
import { DELIVERIES, PAYMENTS, orders, type Order, type OrderLine } from '#demo/orders';

const latest = orders.slice(0, 5);

const costOf = (line: OrderLine): number => line.quantity * line.price;

const columns: NuiTableColumn<Order>[] = [
  {
    key: 'id',
    label: 'Заказ',
    type: 'number',
    width: 120,
    value: (row) => row.id,
    format: (value) => String(value),
  },
  {
    key: 'customer',
    label: 'Клиент',
    type: 'text',
    width: 200,
    flex: 1,
    value: (row) => row.customer,
  },
  { key: 'city', label: 'Город', type: 'text', width: 160, value: (row) => row.city },
  { key: 'total', label: 'Сумма', type: 'number', width: 130, value: (row) => row.total },
];

const lineColumns: NuiTableColumn<OrderLine>[] = [
  { key: 'name', label: 'Товар', type: 'text', width: 200, flex: 1, value: (line) => line.name },
  { key: 'quantity', label: 'Штук', type: 'number', width: 100, value: (line) => line.quantity },
  { key: 'price', label: 'Цена', type: 'number', width: 110, value: (line) => line.price },
  { key: 'cost', label: 'Сумма', type: 'number', width: 120, aggregate: 'sum', value: costOf },
];

const keyOf = (order: Order): number => order.id;
const skuOf = (line: OrderLine): string => line.sku;
const isActive = (order: Order): boolean => order.status !== 'cancelled';

const deliveryOf = (order: Order): string =>
  `${DELIVERIES[order.delivery]}, оплата ${PAYMENTS[order.payment].toLowerCase()}`;

const expanded = ref<TableNodeId[]>([20401]);
</script>
