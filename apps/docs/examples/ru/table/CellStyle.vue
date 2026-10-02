<template>
  <NuiTable
    :columns="columns"
    :rows="lines"
    :get-key="keyOf"
    :cell-style="styleOf"
    bordered
    caption="План и факт, тыс. ₽"
  />
</template>

<script setup lang="ts">
import {
  NuiTable,
  type NuiTableCellRef,
  type NuiTableCellStyle,
  type NuiTableColumn,
} from '@numior/table';

interface Line {
  readonly name: string;
  readonly plan: number;
  readonly fact: number;
  readonly total?: boolean;
}

const lines: Line[] = [
  { name: 'Продажи', plan: 820, fact: 905 },
  { name: 'Услуги', plan: 310, fact: 264 },
  { name: 'Подписки', plan: 140, fact: 171 },
  { name: 'Итого', plan: 1270, fact: 1340, total: true },
];

const deltaOf = (line: Line): number => line.fact - line.plan;

const columns: NuiTableColumn<Line>[] = [
  { key: 'name', label: 'Статья', type: 'text', width: 200, flex: 1, value: (row) => row.name },
  { key: 'plan', label: 'План', type: 'number', width: 120, value: (row) => row.plan },
  { key: 'fact', label: 'Факт', type: 'number', width: 120, value: (row) => row.fact },
  { key: 'delta', label: 'Отклонение', type: 'number', width: 140, value: deltaOf },
];

const TOTAL: NuiTableCellStyle = {
  fill: 'var(--nui-surface-muted)',
  borders: { top: '1px solid var(--nui-text)' },
  style: { 'font-weight': '600' },
};

const BEHIND: NuiTableCellStyle = {
  fill: 'var(--nui-error-soft)',
  color: 'var(--nui-error-soft-foreground)',
};

const AHEAD: NuiTableCellStyle = {
  fill: 'var(--nui-success-soft)',
  color: 'var(--nui-success-soft-foreground)',
};

const styleOf = ({ row, column }: NuiTableCellRef<Line>): NuiTableCellStyle | undefined => {
  if (row.total === true) {
    return TOTAL;
  }
  if (column.key !== 'delta') {
    return undefined;
  }
  return deltaOf(row) < 0 ? BEHIND : AHEAD;
};

const keyOf = (line: Line): string => line.name;
</script>
