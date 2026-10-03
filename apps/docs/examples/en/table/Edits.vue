<template>
  <div class="flex flex-col gap-3">
    <div class="flex gap-2">
      <NuiButton size="sm" variant="outline" tone="neutral" @click="editsTable?.undo()">
        Undo
      </NuiButton>
      <NuiButton size="sm" variant="outline" tone="neutral" @click="editsTable?.redo()">
        Redo
      </NuiButton>
    </div>
    <NuiTable
      cell-selection
      ref="edits-table"
      :columns="columns"
      :rows="orders"
      :get-key="keyOf"
      caption="Orders this week"
      @edit="onEdit"
    />
    <p class="text-sm text-muted-foreground">Last edit: {{ last }}</p>
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

interface Order {
  readonly id: number;
  customer: string | null;
  city: string | null;
  total: number | null;
}

const orders = ref<Order[]>([
  { id: 20419, customer: 'Anna Titova', city: 'Moscow', total: 12400 },
  { id: 20420, customer: 'Igor Belov', city: 'Kazan', total: 3150 },
  { id: 20421, customer: 'Maria Kim', city: 'Moscow', total: 48900 },
  { id: 20422, customer: 'Oleg Smirnov', city: 'Tver', total: 990 },
]);

const money = new Intl.NumberFormat('en-US', {
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
    label: 'Customer',
    type: 'text',
    width: 160,
    flex: 1,
    editable: true,
    rules: [required()],
    value: (row) => row.customer,
  },
  {
    key: 'city',
    label: 'City',
    type: 'text',
    width: 120,
    editable: true,
    value: (row) => row.city,
  },
  {
    key: 'total',
    label: 'Total',
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
