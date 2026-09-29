<template>
  <NuiTable
    v-model:expanded="expanded"
    :columns="columns"
    :rows="units"
    :get-key="keyOf"
    :get-children="childrenOf"
    :has-children="isLazy"
    caption="Штат по отделам"
    @load="load"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTable, type NuiTableColumn, type TableNodeId } from '@numior/table';

interface Unit {
  readonly id: string;
  readonly name: string;
  readonly head: string;
  readonly people: number;
  readonly children?: readonly Unit[];
  readonly lazy?: boolean;
}

const UNITS: readonly Unit[] = [
  {
    id: 'dev',
    name: 'Разработка',
    head: 'Павел Попов',
    people: 14,
    children: [
      { id: 'dev-web', name: 'Фронтенд', head: 'Ольга Соколова', people: 6 },
      { id: 'dev-api', name: 'Бэкенд', head: 'Сергей Иванов', people: 8 },
    ],
  },
  { id: 'design', name: 'Дизайн', head: 'Нина Белова', people: 4 },
  { id: 'support', name: 'Поддержка', head: 'Елена Кузнецова', people: 5, lazy: true },
];

const LINES: readonly Unit[] = [
  { id: 'support-1', name: 'Первая линия', head: 'Мария Лебедева', people: 3 },
  { id: 'support-2', name: 'Вторая линия', head: 'Дмитрий Попов', people: 2 },
];

const LOAD_DELAY = 700;

const columns: NuiTableColumn<Unit>[] = [
  { key: 'name', label: 'Отдел', type: 'text', width: 220, flex: 1, value: (row) => row.name },
  { key: 'head', label: 'Руководитель', type: 'text', width: 180, value: (row) => row.head },
  { key: 'people', label: 'Человек', type: 'number', width: 120, value: (row) => row.people },
];

const keyOf = (unit: Unit): string => unit.id;
const childrenOf = (unit: Unit): readonly Unit[] | undefined => unit.children;
const isLazy = (unit: Unit): boolean => unit.lazy === true;
const units = ref<readonly Unit[]>(UNITS);
const expanded = ref<TableNodeId[]>(['dev']);

const load = (unit: Unit): void => {
  setTimeout(() => {
    units.value = units.value.map((entry) =>
      entry.id === unit.id ? { ...entry, children: LINES } : entry,
    );
  }, LOAD_DELAY);
};
</script>
