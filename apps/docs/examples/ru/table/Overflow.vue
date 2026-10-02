<template>
  <NuiTable
    :columns="columns"
    :rows="lines"
    :get-key="keyOf"
    :cell-style="styleOf"
    :column-menu="false"
    bordered
    caption="Тарифы, ₽"
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
  readonly month: number | null;
  readonly year: number | null;
}

const DISCOUNT = 'Скидка 20 % при оплате за год действует до конца месяца';

const lines: Line[] = [
  { name: 'Старт', month: 990, year: 9900 },
  { name: 'Команда', month: 2490, year: 24900 },
  { name: DISCOUNT, month: null, year: null },
  { name: 'Бизнес', month: 4990, year: 49900 },
];

const columns: NuiTableColumn<Line>[] = [
  {
    key: 'name',
    label: 'Тариф',
    type: 'text',
    width: 160,
    sortable: false,
    filter: false,
    value: (row) => row.name,
  },
  {
    key: 'month',
    label: 'За месяц',
    type: 'number',
    width: 140,
    sortable: false,
    filter: false,
    value: (row) => row.month,
  },
  {
    key: 'year',
    label: 'За год',
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
