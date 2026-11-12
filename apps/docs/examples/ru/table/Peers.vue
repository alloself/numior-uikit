<template>
  <NuiTable
    ref="tasks-table"
    :columns="columns"
    :rows="tasks"
    :get-key="keyOf"
    :column-menu="false"
    gridlines
    caption="Задачи спринта"
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
  { id: 't1', title: 'Экран входа', owner: 'Ольга', hours: 6 },
  { id: 't2', title: 'Поиск по каталогу', owner: 'Игорь', hours: 12 },
  { id: 't3', title: 'Оплата картой', owner: 'Анна', hours: 8 },
  { id: 't4', title: 'Отчёт за месяц', owner: 'Борис', hours: 4 },
];

const people: readonly Person[] = [
  { id: 'anna', name: 'Анна', colour: 2, at: { row: 't3', column: 'hours' } },
  { id: 'boris', name: 'Борис', colour: 5, at: { row: 't1', column: 'title' } },
];

const columns: NuiTableColumn<Task>[] = [
  { key: 'title', label: 'Задача', type: 'text', width: 200, value: (row) => row.title },
  { key: 'owner', label: 'Исполнитель', type: 'text', width: 140, value: (row) => row.owner },
  { key: 'hours', label: 'Часы', type: 'number', width: 100, value: (row) => row.hours },
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
