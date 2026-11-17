<template>
  <NuiTable
    :columns="columns"
    :rows="tasks"
    :get-key="keyOf"
    :controls="kitControls"
    caption="Sprint tasks"
    @edit="onEdit"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiSelect, isString, type NuiOption } from '@numior/kit';
import { kitControls } from '@numior/kit/controls';
import {
  NuiTable,
  tableEditor,
  type NuiTableCellValue,
  type NuiTableColumn,
  type NuiTableEditEvent,
} from '@numior/kit/table';
import { team } from '#demo/team';

interface Task {
  readonly id: number;
  readonly title: string;
  status: string | null;
  owner: string | null;
  hours: number | null;
}

const optionOf = (value: string): NuiOption<string> => ({ value, label: value });

const STATUSES = ['New', 'In progress', 'Done'].map(optionOf);
const [anna, igor, maria] = team;
const OWNERS = [anna, igor, maria].map((person) => optionOf(person.name));

const tasks = ref<Task[]>([
  { id: 1, title: 'Sign-in form', status: 'In progress', owner: anna.name, hours: 6 },
  { id: 2, title: 'Report export', status: 'New', owner: igor.name, hours: 4 },
  { id: 3, title: 'Order search', status: 'Done', owner: maria.name, hours: 10 },
]);

const columns: NuiTableColumn<Task>[] = [
  {
    key: 'title',
    label: 'Task',
    type: 'text',
    width: 200,
    flex: 1,
    value: (row) => row.title,
  },
  {
    key: 'status',
    label: 'Status',
    type: 'text',
    width: 140,
    editable: true,
    editor: tableEditor(NuiSelect, isString, { props: { options: STATUSES } }),
    value: (row) => row.status,
  },
  {
    key: 'owner',
    label: 'Owner',
    type: 'text',
    width: 160,
    editable: true,
    editor: { control: 'select', props: { options: OWNERS } },
    value: (row) => row.owner,
  },
  {
    key: 'hours',
    label: 'Hours',
    type: 'number',
    width: 110,
    editable: true,
    editor: { control: 'number', props: { min: 0, step: 1 } },
    value: (row) => row.hours,
  },
];

const keyOf = (task: Task): number => task.id;

const textOf = (value: NuiTableCellValue): string | null =>
  typeof value === 'string' ? value : null;

const setters: Readonly<Record<string, (row: Task, value: NuiTableCellValue) => void>> = {
  status: (row, value) => {
    row.status = textOf(value);
  },
  owner: (row, value) => {
    row.owner = textOf(value);
  },
  hours: (row, value) => {
    row.hours = typeof value === 'number' ? value : null;
  },
};

const onEdit = (event: NuiTableEditEvent<Task>): void => {
  for (const { row, key, value } of event.changes) {
    setters[key]?.(row, value);
  }
};
</script>
