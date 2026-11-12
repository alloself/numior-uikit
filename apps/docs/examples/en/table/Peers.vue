<template>
  <NuiTable
    ref="tasks-table"
    :columns="columns"
    :rows="tasks"
    :get-key="keyOf"
    :column-menu="false"
    gridlines
    caption="Sprint tasks"
  >
    <template #overlay="{ rectOf }">
      <NuiTablePeers :peers="peers" :rect-of="rectOf" />
    </template>
  </NuiTable>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import {
  NuiTable,
  NuiTablePeers,
  type NuiTableCellKey,
  type NuiTableColumn,
  type NuiTableExposed,
  type NuiTablePeer,
} from '@numior/table';

interface Task {
  readonly id: string;
  readonly title: string;
  readonly owner: string;
  readonly hours: number;
}

interface Person {
  readonly id: string;
  readonly name: string;
  readonly colour: number;
  readonly at: NuiTableCellKey;
}

const tasks: Task[] = [
  { id: 't1', title: 'Sign-in screen', owner: 'Olga', hours: 6 },
  { id: 't2', title: 'Catalogue search', owner: 'Igor', hours: 12 },
  { id: 't3', title: 'Card payment', owner: 'Anna', hours: 8 },
  { id: 't4', title: 'Monthly report', owner: 'Boris', hours: 4 },
];

const people: readonly Person[] = [
  { id: 'anna', name: 'Anna', colour: 2, at: { row: 't3', column: 'hours' } },
  { id: 'boris', name: 'Boris', colour: 5, at: { row: 't1', column: 'title' } },
];

const columns: NuiTableColumn<Task>[] = [
  { key: 'title', label: 'Task', type: 'text', width: 200, value: (row) => row.title },
  { key: 'owner', label: 'Owner', type: 'text', width: 140, value: (row) => row.owner },
  { key: 'hours', label: 'Hours', type: 'number', width: 100, value: (row) => row.hours },
];

const table = useTemplateRef<NuiTableExposed>('tasks-table');

const peers = computed(() =>
  people.reduce<NuiTablePeer[]>((shown, person) => {
    const position = table.value?.positionOf(person.at);

    if (position === undefined) {
      return shown;
    }

    shown.push({
      key: person.id,
      name: person.name,
      colour: person.colour,
      cell: { from: position, to: position },
    });

    return shown;
  }, []),
);

const keyOf = (task: Task): string => task.id;
</script>
