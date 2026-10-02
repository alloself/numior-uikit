<template>
  <NuiTable
    v-model:expanded="expanded"
    :columns="columns"
    :rows="orders"
    :get-key="keyOf"
    :has-detail="hasItems"
    caption="Orders and their items"
  >
    <template #detail="{ row }">
      <div class="flex flex-col gap-3">
        <p class="text-sm text-muted-foreground">{{ row.note }}</p>
        <NuiTable
          :columns="itemColumns"
          :rows="row.items"
          :get-key="skuOf"
          size="sm"
          label="Order items"
          totals-label="Total"
        />
      </div>
    </template>
  </NuiTable>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTable, type NuiTableColumn, type TableNodeId } from '@numior/table';

interface Item {
  readonly sku: string;
  readonly name: string;
  readonly quantity: number;
  readonly price: number;
}

interface Order {
  readonly id: number;
  readonly customer: string;
  readonly city: string;
  readonly note: string;
  readonly items: readonly Item[];
}

const orders: readonly Order[] = [
  {
    id: 1041,
    customer: 'Anna Smith',
    city: 'London',
    note: 'Call an hour before the delivery.',
    items: [
      { sku: 'kettle', name: 'Kettle', quantity: 1, price: 4200 },
      { sku: 'cups', name: 'Cups, a set', quantity: 2, price: 1800 },
    ],
  },
  {
    id: 1042,
    customer: 'Ivan Popov',
    city: 'Berlin',
    note: 'Leave it with the concierge.',
    items: [{ sku: 'grinder', name: 'Coffee grinder', quantity: 1, price: 6900 }],
  },
  { id: 1043, customer: 'Maria Costa', city: 'Lisbon', note: '', items: [] },
  {
    id: 1044,
    customer: 'Paul Sokolov',
    city: 'Prague',
    note: 'Deliver after six in the evening.',
    items: [
      { sku: 'toaster', name: 'Toaster', quantity: 1, price: 5100 },
      { sku: 'scales', name: 'Scales', quantity: 1, price: 2300 },
      { sku: 'thermos', name: 'Thermos', quantity: 3, price: 1500 },
    ],
  },
];

const costOf = (item: Item): number => item.quantity * item.price;

const totalOf = (order: Order): number => order.items.reduce((sum, item) => sum + costOf(item), 0);

const columns: NuiTableColumn<Order>[] = [
  {
    key: 'id',
    label: 'Order',
    type: 'number',
    width: 120,
    value: (row) => row.id,
    format: (value) => String(value),
  },
  {
    key: 'customer',
    label: 'Customer',
    type: 'text',
    width: 200,
    flex: 1,
    value: (row) => row.customer,
  },
  { key: 'city', label: 'City', type: 'text', width: 140, value: (row) => row.city },
  { key: 'total', label: 'Total', type: 'number', width: 130, value: totalOf },
];

const itemColumns: NuiTableColumn<Item>[] = [
  { key: 'name', label: 'Item', type: 'text', width: 200, flex: 1, value: (item) => item.name },
  { key: 'quantity', label: 'Pieces', type: 'number', width: 100, value: (item) => item.quantity },
  { key: 'price', label: 'Price', type: 'number', width: 110, value: (item) => item.price },
  { key: 'cost', label: 'Cost', type: 'number', width: 120, aggregate: 'sum', value: costOf },
];

const keyOf = (order: Order): number => order.id;
const skuOf = (item: Item): string => item.sku;
const hasItems = (order: Order): boolean => order.items.length > 0;
const expanded = ref<TableNodeId[]>([1041]);
</script>
