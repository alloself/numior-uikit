<template>
  <NuiTable
    v-bind="cells"
    :column-menu="false"
    gridlines
    size="sm"
    height="18rem"
    caption="Team costs, thousand ₽"
  />
</template>

<script setup lang="ts">
import {
  NuiTable,
  tableCells,
  type NuiTableCellStyle,
  type NuiTableSourceCell,
} from '@numior/table';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ITEMS = [
  'Rent',
  'Phone',
  'Cloud',
  'Ads',
  'Subscriptions',
  'Training',
  'Travel',
  'Hardware',
  'Stationery',
  'Delivery',
];

const ROWS = 1000;
const COLS = 52;

const HEAD: NuiTableCellStyle = {
  fill: 'var(--color-surface-muted)',
  style: { 'font-weight': 'var(--font-weight-semibold)' },
};

const NUMBER: NuiTableCellStyle = { align: 'end' };

const amountOf = (row: number, col: number): number => 40 + ((row * 37 + col * 23) % 160);

const headCell = (col: number): NuiTableSourceCell | undefined =>
  col <= MONTHS.length
    ? { text: col === 0 ? 'Item' : (MONTHS[col - 1] ?? ''), style: HEAD }
    : undefined;

const itemCell = (row: number, col: number): NuiTableSourceCell | undefined => {
  if (col === 0) {
    return { text: ITEMS[row - 1] ?? '' };
  }
  return col <= MONTHS.length ? { text: String(amountOf(row, col)), style: NUMBER } : undefined;
};

const cellAt = (row: number, col: number): NuiTableSourceCell | undefined => {
  if (row === 0) {
    return headCell(col);
  }
  return row <= ITEMS.length ? itemCell(row, col) : undefined;
};

const cells = tableCells({ rows: ROWS, cols: COLS, cellAt });
</script>
