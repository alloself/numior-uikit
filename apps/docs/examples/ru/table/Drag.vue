<template>
  <div class="flex flex-col gap-3">
    <NuiTable
      v-model:expanded="expanded"
      :columns="columns"
      :rows="units"
      :get-key="keyOf"
      :get-children="childrenOf"
      row-drag
      caption="Отделы в порядке приоритета"
      @reorder="onReorder"
    />
    <p class="text-sm text-muted-foreground">Последнее перемещение: {{ last }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiTable,
  type NuiTableColumn,
  type NuiTableReorderEvent,
  type TableNodeId,
} from '@numior/table';

interface Unit {
  readonly id: string;
  readonly name: string;
  readonly people: number;
  readonly children?: readonly Unit[];
}

const START: readonly Unit[] = [
  {
    id: 'dev',
    name: 'Разработка',
    people: 14,
    children: [
      { id: 'dev-web', name: 'Фронтенд', people: 6 },
      { id: 'dev-api', name: 'Бэкенд', people: 8 },
    ],
  },
  { id: 'design', name: 'Дизайн', people: 4 },
  { id: 'support', name: 'Поддержка', people: 5 },
];

const columns: NuiTableColumn<Unit>[] = [
  { key: 'name', label: 'Отдел', type: 'text', width: 220, flex: 1, value: (row) => row.name },
  { key: 'people', label: 'Человек', type: 'number', width: 120, value: (row) => row.people },
];

const keyOf = (unit: Unit): string => unit.id;
const childrenOf = (unit: Unit): readonly Unit[] | undefined => unit.children;
const units = ref<readonly Unit[]>(START);
const expanded = ref<TableNodeId[]>(['dev']);
const last = ref('—');

const moved = (list: readonly Unit[], from: number, to: number): Unit[] => {
  const next = [...list];
  const [item] = next.splice(from, 1);

  if (item !== undefined) {
    next.splice(to, 0, item);
  }
  return next;
};

const movedWithin = (list: readonly Unit[], event: NuiTableReorderEvent<Unit>): Unit[] => {
  if (event.parent === undefined) {
    return moved(list, event.from, event.to);
  }
  return list.map((unit) => {
    if (unit.children === undefined) {
      return unit;
    }
    return unit === event.parent
      ? { ...unit, children: moved(unit.children, event.from, event.to) }
      : { ...unit, children: movedWithin(unit.children, event) };
  });
};

const onReorder = (event: NuiTableReorderEvent<Unit>): void => {
  units.value = movedWithin(units.value, event);
  last.value = `${event.row.name}: ${event.from + 1} → ${event.to + 1}`;
};
</script>
