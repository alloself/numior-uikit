<template>
  <NuiTable
    v-model:expanded="expanded"
    :columns="columns"
    :rows="units"
    :get-key="keyOf"
    :get-children="childrenOf"
    row-drag
    caption="Departments by priority"
    @reorder="onReorder"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiTable,
  type NuiTableColumn,
  type NuiTableReorderEvent,
  type TableNodeId,
} from '@numior/kit/table';

interface Unit {
  readonly id: string;
  readonly name: string;
  readonly people: number;
  readonly children?: readonly Unit[];
}

const START: readonly Unit[] = [
  {
    id: 'dev',
    name: 'Engineering',
    people: 14,
    children: [
      { id: 'dev-web', name: 'Frontend', people: 6 },
      { id: 'dev-api', name: 'Backend', people: 8 },
    ],
  },
  { id: 'design', name: 'Design', people: 4 },
  { id: 'support', name: 'Support', people: 5 },
];

const columns: NuiTableColumn<Unit>[] = [
  { key: 'name', label: 'Department', type: 'text', width: 220, flex: 1, value: (row) => row.name },
  { key: 'people', label: 'People', type: 'number', width: 120, value: (row) => row.people },
];

const keyOf = (unit: Unit): string => unit.id;
const childrenOf = (unit: Unit): readonly Unit[] | undefined => unit.children;
const units = ref<readonly Unit[]>(START);
const expanded = ref<TableNodeId[]>(['dev']);

const inserted = (list: readonly Unit[], unit: Unit, index: number): Unit[] => [
  ...list.slice(0, index),
  unit,
  ...list.slice(index),
];

const without = (list: readonly Unit[], id: string): Unit[] =>
  list.flatMap((unit) => {
    if (unit.id === id) {
      return [];
    }
    return [unit.children === undefined ? unit : { ...unit, children: without(unit.children, id) }];
  });

const placed = (
  list: readonly Unit[],
  parentId: string | undefined,
  unit: Unit,
  index: number,
): Unit[] => {
  if (parentId === undefined) {
    return inserted(list, unit, index);
  }
  return list.map((entry) => {
    if (entry.id === parentId) {
      return { ...entry, children: inserted(entry.children ?? [], unit, index) };
    }
    return entry.children === undefined
      ? entry
      : { ...entry, children: placed(entry.children, parentId, unit, index) };
  });
};

const withParent = (ids: readonly TableNodeId[], id: string | undefined): TableNodeId[] =>
  id === undefined || ids.includes(id) ? [...ids] : [...ids, id];

const onReorder = (event: NuiTableReorderEvent<Unit>): void => {
  const target = event.toParent === undefined ? undefined : event.toParent.id;

  units.value = placed(without(units.value, event.row.id), target, event.row, event.to);
  expanded.value = withParent(expanded.value, target);
};
</script>
