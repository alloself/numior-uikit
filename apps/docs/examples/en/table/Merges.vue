<template>
  <NuiTable
    :columns="columns"
    :rows="slots"
    :get-key="keyOf"
    :merges="merges"
    :cell-style="styleOf"
    :column-menu="false"
    bordered
    caption="Programme of the day"
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

const HALLS = ['Hall A', 'Hall B', 'Hall C'];

const slots: Slot[] = [
  { time: '10:00', halls: ['Opening', '', ''] },
  { time: '11:00', halls: ['Forms without pain', 'Table workshop', 'Accessibility'] },
  { time: '12:00', halls: ['Themes and tokens', '', 'Icons on demand'] },
  { time: '13:00', halls: ['Lunch', '', ''] },
  { time: '14:00', halls: ['Virtual lists', 'Editor', 'Questions and answers'] },
];

const columns: NuiTableColumn<Slot>[] = [
  {
    key: 'time',
    label: 'Time',
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
