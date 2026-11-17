<template>
  <NuiTable
    :columns="columns"
    :rows="lines"
    :get-key="keyOf"
    :cell-style="styleOf"
    :column-menu="false"
    gridlines
    caption="Plans, ₽"
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
  readonly month: number | null;
  readonly year: number | null;
}

const DISCOUNT = 'The 20 % discount for yearly payment ends this month';

const lines: Line[] = [
  { name: 'Start', month: 990, year: 9900 },
  { name: 'Team', month: 2490, year: 24900 },
  { name: DISCOUNT, month: null, year: null },
  { name: 'Business', month: 4990, year: 49900 },
];

const columns: NuiTableColumn<Line>[] = [
  {
    key: 'name',
    label: 'Plan',
    type: 'text',
    width: 160,
    sortable: false,
    filter: false,
    value: (row) => row.name,
  },
  {
    key: 'month',
    label: 'Per month',
    type: 'number',
    width: 140,
    sortable: false,
    filter: false,
    value: (row) => row.month,
  },
  {
    key: 'year',
    label: 'Per year',
    type: 'number',
    width: 140,
    flex: 1,
    sortable: false,
    filter: false,
    value: (row) => row.year,
  },
];

const NOTE: NuiTableCellStyle = { color: 'var(--nui-text-muted)', overflow: true };

const styleOf = ({ row, column }: NuiTableCellRef<Line>): NuiTableCellStyle | undefined =>
  column.key === 'name' && row.month === null ? NOTE : undefined;

const keyOf = (line: Line): string => line.name;
</script>
