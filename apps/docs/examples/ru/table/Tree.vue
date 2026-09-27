<template>
  <NuiTable
    v-model:expanded="expanded"
    :columns="columns"
    :rows="departments"
    :get-key="keyOf"
    :get-children="childrenOf"
    caption="Штат по отделам"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTable, type NuiTableColumn } from '@numior/vue';

interface Unit {
  readonly name: string;
  readonly people: number;
  readonly children?: readonly Unit[];
}

const departments: Unit[] = [
  {
    name: 'Разработка',
    people: 14,
    children: [
      { name: 'Фронтенд', people: 6 },
      { name: 'Бэкенд', people: 8 },
    ],
  },
  { name: 'Дизайн', people: 4 },
  { name: 'Поддержка', people: 5, children: [{ name: 'Первая линия', people: 5 }] },
];

const columns: NuiTableColumn<Unit>[] = [
  { key: 'name', label: 'Отдел' },
  { key: 'people', label: 'Человек', align: 'end', width: 128 },
];

const keyOf = (unit: Unit): string => unit.name;
const childrenOf = (unit: Unit): readonly Unit[] | undefined => unit.children;
const expanded = ref<Unit[]>([departments[0]].filter((unit): unit is Unit => unit !== undefined));
</script>
