<template>
  <NuiTable
    cell-selection
    :columns="columns"
    :rows="slots"
    :get-key="keyOf"
    :merges="merges"
    :cell-style="styleOf"
    :column-menu="false"
    bordered
    caption="Программа дня"
  />
</template>

<script setup lang="ts">
import {
  NuiTable,
  type NuiTableCellRef,
  type NuiTableCellStyle,
  type NuiTableColumn,
  type NuiTableRange,
} from '@numior/table';

interface Slot {
  readonly time: string;
  readonly halls: readonly string[];
}

const HALLS = ['Зал А', 'Зал Б', 'Зал В'];

const slots: Slot[] = [
  { time: '10:00', halls: ['Открытие', '', ''] },
  { time: '11:00', halls: ['Формы без боли', 'Воркшоп по таблицам', 'Доступность'] },
  { time: '12:00', halls: ['Темы и токены', '', 'Иконки по требованию'] },
  { time: '13:00', halls: ['Обед', '', ''] },
  { time: '14:00', halls: ['Виртуальные списки', 'Редактор', 'Вопросы и ответы'] },
];

const columns: NuiTableColumn<Slot>[] = [
  {
    key: 'time',
    label: 'Время',
    type: 'text',
    width: 96,
    sortable: false,
    filter: false,
    value: (row) => row.time,
  },
  ...HALLS.map((label, hall): NuiTableColumn<Slot> => ({
    key: `hall${hall}`,
    label,
    type: 'text',
    width: 170,
    flex: 1,
    sortable: false,
    filter: false,
    value: (row) => row.halls[hall],
  })),
];

const merges: NuiTableRange[] = [
  { from: { row: 0, col: 1 }, to: { row: 0, col: 3 } },
  { from: { row: 1, col: 2 }, to: { row: 2, col: 2 } },
  { from: { row: 3, col: 1 }, to: { row: 3, col: 3 } },
];

const COMMON: NuiTableCellStyle = { fill: 'var(--nui-surface-muted)' };

const WORKSHOP: NuiTableCellStyle = {
  fill: 'var(--nui-primary-soft)',
  color: 'var(--nui-primary-soft-foreground)',
  align: 'center',
  wrap: true,
};

const STYLES: Readonly<Record<string, NuiTableCellStyle>> = {
  '10:00 hall0': COMMON,
  '13:00 hall0': COMMON,
  '11:00 hall1': WORKSHOP,
};

const styleOf = ({ row, column }: NuiTableCellRef<Slot>): NuiTableCellStyle | undefined =>
  STYLES[`${row.time} ${column.key}`];

const keyOf = (slot: Slot): string => slot.time;
</script>
