<template>
  <NuiTable
    v-model:expanded="expanded"
    :columns="columns"
    :rows="orders"
    :get-key="keyOf"
    :has-detail="hasItems"
    caption="Заказы и их состав"
  >
    <template #detail="{ row }">
      <div class="flex flex-col gap-3">
        <p class="text-sm text-muted-foreground">{{ row.note }}</p>
        <NuiTable
          :columns="itemColumns"
          :rows="row.items"
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
    customer: 'Анна Смирнова',
    city: 'Москва',
    note: 'Позвонить за час до доставки.',
    items: [
      { sku: 'kettle', name: 'Чайник', quantity: 1, price: 4200 },
      { sku: 'cups', name: 'Чашки, набор', quantity: 2, price: 1800 },
    ],
  },
  {
    id: 1042,
    customer: 'Иван Попов',
    city: 'Казань',
    note: 'Оставить у консьержа.',
    items: [{ sku: 'grinder', name: 'Кофемолка', quantity: 1, price: 6900 }],
  },
  { id: 1043, customer: 'Мария Кузнецова', city: 'Ереван', note: '', items: [] },
  {
    id: 1044,
    customer: 'Павел Соколов',
    city: 'Минск',
    note: 'Доставка после шести вечера.',
    items: [
      { sku: 'toaster', name: 'Тостер', quantity: 1, price: 5100 },
      { sku: 'scales', name: 'Весы', quantity: 1, price: 2300 },
      { sku: 'thermos', name: 'Термос', quantity: 3, price: 1500 },
    ],
  },
];

const costOf = (item: Item): number => item.quantity * item.price;

const totalOf = (order: Order): number => order.items.reduce((sum, item) => sum + costOf(item), 0);

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
  { key: 'city', label: 'Город', type: 'text', width: 140, value: (row) => row.city },
  { key: 'total', label: 'Сумма', type: 'number', width: 130, value: totalOf },
];

const itemColumns: NuiTableColumn<Item>[] = [
  { key: 'name', label: 'Товар', type: 'text', width: 200, flex: 1, value: (item) => item.name },
  { key: 'quantity', label: 'Штук', type: 'number', width: 100, value: (item) => item.quantity },
  { key: 'price', label: 'Цена', type: 'number', width: 110, value: (item) => item.price },
  { key: 'cost', label: 'Сумма', type: 'number', width: 120, aggregate: 'sum', value: costOf },
];

const keyOf = (order: Order): number => order.id;
const skuOf = (item: Item): string => item.sku;
const hasItems = (order: Order): boolean => order.items.length > 0;
const expanded = ref<TableNodeId[]>([1041]);
</script>
