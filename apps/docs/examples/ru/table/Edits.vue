<template>
  <div class="flex flex-col gap-3">
    <div class="flex gap-2">
      <NuiButton size="sm" variant="outline" tone="neutral" @click="editsTable?.undo()">
        Отменить
      </NuiButton>
      <NuiButton size="sm" variant="outline" tone="neutral" @click="editsTable?.redo()">
        Повторить
      </NuiButton>
    </div>
    <NuiTable
      cell-selection
      ref="edits-table"
      :columns="columns"
      :rows="rows"
      :get-key="keyOf"
      caption="Заказы за неделю"
      @edit="onEdit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { min, required } from '@numior/forms';
import { NuiButton } from '@numior/vue';
import {
  NuiTable,
  type NuiTableCellValue,
  type NuiTableColumn,
  type NuiTableEditEvent,
  type NuiTableExposed,
} from '@numior/table';
import { orders } from '#demo/orders';

interface Order {
  readonly id: number;
  customer: string | null;
  city: string | null;
  total: number | null;
}

const rows = ref<Order[]>(
  orders.slice(0, 4).map(({ id, customer, city, total }) => ({ id, customer, city, total })),
);

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
    editable: true,
    rules: [required()],
    value: (row) => row.customer,
  },
  {
    key: 'city',
    label: 'Город',
    type: 'text',
    width: 120,
    editable: true,
    value: (row) => row.city,
  },
  {
    key: 'total',
    label: 'Сумма',
    type: 'number',
    width: 120,
    editable: true,
    rules: [min(0)],
    aggregate: 'sum',
    value: (row) => row.total,
    format: (value) => money.format(value),
  },
];

const keyOf = (order: Order): number => order.id;
const editsTable = useTemplateRef<NuiTableExposed>('edits-table');

const setters: Readonly<Record<string, (row: Order, value: NuiTableCellValue) => void>> = {
  customer: (row, value) => {
    row.customer = typeof value === 'string' ? value : null;
  },
  city: (row, value) => {
    row.city = typeof value === 'string' ? value : null;
  },
  total: (row, value) => {
    row.total = typeof value === 'number' ? value : null;
  },
};

const onEdit = (event: NuiTableEditEvent<Order>): void => {
  for (const { row, key, value } of event.changes) {
    setters[key]?.(row, value);
  }
};
</script>
