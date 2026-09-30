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
      ref="edits-table"
      :columns="columns"
      :rows="orders"
      :get-key="keyOf"
      caption="Заказы за неделю"
      @edit="onEdit"
    />
    <p class="text-sm text-muted-foreground">Последняя правка: {{ last }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { NuiButton } from '@numior/vue';
import {
  NuiTable,
  type NuiTableCellValue,
  type NuiTableColumn,
  type NuiTableEditEvent,
  type NuiTableExposed,
} from '@numior/table';

interface Order {
  readonly id: number;
  customer: string | null;
  city: string | null;
  total: number | null;
}

const orders = ref<Order[]>([
  { id: 20419, customer: 'Анна Титова', city: 'Москва', total: 12400 },
  { id: 20420, customer: 'Игорь Белов', city: 'Казань', total: 3150 },
  { id: 20421, customer: 'Мария Ким', city: 'Москва', total: 48900 },
  { id: 20422, customer: 'Олег Смирнов', city: 'Тверь', total: 990 },
]);

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
    aggregate: 'sum',
    value: (row) => row.total,
    format: (value) => money.format(value),
  },
];

const keyOf = (order: Order): number => order.id;
const editsTable = useTemplateRef<NuiTableExposed>('edits-table');
const last = ref('—');

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
  last.value = `${event.kind}, ${event.changes.length}`;
};
</script>
