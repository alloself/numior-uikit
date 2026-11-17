<template>
  <div class="flex flex-col gap-3">
    <NuiTable
      cell-selection
      :columns="columns"
      :rows="items"
      :get-key="keyOf"
      :clipboard="clipboard"
      :column-menu="false"
      :caption="CAPTION"
      @edit="onEdit"
    />
    <pre class="min-h-16 text-sm text-muted-foreground">{{ copied }}</pre>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiTable,
  type NuiTableCellValue,
  type NuiTableClipboard,
  type NuiTableClipboardScope,
  type NuiTableColumn,
  type NuiTableEditEvent,
} from '@numior/kit/table';

interface Item {
  readonly sku: string;
  name: string;
  stock: number | null;
}

type Field = 'sku' | 'name' | 'stock';

const CAPTION = 'Склад: Ctrl+C копирует таблицу Markdown, вставка понимает «;»';

const LABELS: Readonly<Record<Field, string>> = { sku: 'Артикул', name: 'Товар', stock: 'Остаток' };

const TEXTS: Readonly<Record<Field, (item: Item) => string>> = {
  sku: (item) => item.sku,
  name: (item) => item.name,
  stock: (item) => (item.stock === null ? '' : String(item.stock)),
};

const items = ref<Item[]>([
  { sku: 'A-101', name: 'Кресло', stock: 12 },
  { sku: 'A-102', name: 'Стол', stock: 4 },
  { sku: 'B-201', name: 'Лампа', stock: 31 },
  { sku: 'B-202', name: 'Полка', stock: 9 },
]);

const columns: NuiTableColumn<Item>[] = [
  { key: 'sku', label: LABELS.sku, type: 'text', width: 110, value: (row) => row.sku },
  {
    key: 'name',
    label: LABELS.name,
    type: 'text',
    width: 200,
    flex: 1,
    editable: true,
    value: (row) => row.name,
  },
  {
    key: 'stock',
    label: LABELS.stock,
    type: 'number',
    width: 110,
    editable: true,
    value: (row) => row.stock,
  },
];

const copied = ref('');

const isField = (key: string | undefined): key is Field =>
  key === 'sku' || key === 'name' || key === 'stock';

const markdownOf = ({
  rows,
  cols,
  headers,
  rowAt,
  keyAt,
}: NuiTableClipboardScope<Item>): string => {
  const fields = cols.map(keyAt).filter(isField);

  const body = rows
    .map(rowAt)
    .map((row) => fields.map((field) => (row === undefined ? '' : TEXTS[field](row))));

  const head = headers ? [fields.map((field) => LABELS[field]), fields.map(() => '---')] : [];

  return [...head, ...body].map((cells) => `| ${cells.join(' | ')} |`).join('\n');
};

const clipboard: NuiTableClipboard<Item> = {
  serialize: (scope) => {
    copied.value = markdownOf(scope);
    return { text: copied.value };
  },
  parse: ({ text }) =>
    text.includes(';')
      ? text
          .trim()
          .split(/\r?\n/)
          .map((line) => line.split(';'))
      : undefined,
};

const keyOf = (item: Item): string => item.sku;

const setters: Readonly<Record<string, (item: Item, value: NuiTableCellValue) => void>> = {
  name: (item, value) => {
    item.name = typeof value === 'string' ? value : '';
  },
  stock: (item, value) => {
    item.stock = typeof value === 'number' ? value : null;
  },
};

const onEdit = (event: NuiTableEditEvent<Item>): void => {
  for (const { row, key, value } of event.changes) {
    setters[key]?.(row, value);
  }
};
</script>
