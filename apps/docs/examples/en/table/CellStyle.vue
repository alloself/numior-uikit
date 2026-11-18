<template>
  <NuiTable
    :columns="columns"
    :rows="lines"
    :get-key="keyOf"
    :cell-style="styleOf"
    gridlines
    caption="Plan and actual, thousand ₽"
  />
</template>

<script setup lang="ts">
import {
  NuiTable,
  type NuiTableCellRef,
  type NuiTableCellStyle,
  type NuiTableColumn,
} from '@numior/kit/table';

interface Line {
  readonly name: string;
  readonly plan: number;
  readonly fact: number;
  readonly total?: boolean;
}

const lines: Line[] = [
  { name: 'Sales', plan: 820, fact: 905 },
  { name: 'Services', plan: 310, fact: 264 },
  { name: 'Subscriptions', plan: 140, fact: 171 },
  { name: 'Total', plan: 1270, fact: 1340, total: true },
];

const deltaOf = (line: Line): number => line.fact - line.plan;

const columns: NuiTableColumn<Line>[] = [
  { key: 'name', label: 'Line', type: 'text', width: 200, flex: 1, value: (row) => row.name },
  { key: 'plan', label: 'Plan', type: 'number', width: 120, value: (row) => row.plan },
  { key: 'fact', label: 'Actual', type: 'number', width: 120, value: (row) => row.fact },
  { key: 'delta', label: 'Variance', type: 'number', width: 140, value: deltaOf },
];

const TOTAL: NuiTableCellStyle = {
  fill: 'var(--color-surface-muted)',
  borders: { top: '1px solid var(--color-border-strong)' },
  style: { 'font-weight': '600' },
};

const BEHIND: NuiTableCellStyle = {
  class: 'bg-error-soft text-error-soft-foreground',
};

const AHEAD: NuiTableCellStyle = {
  class: 'bg-success-soft text-success-soft-foreground',
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
