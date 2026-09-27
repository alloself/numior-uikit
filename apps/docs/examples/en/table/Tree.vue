<template>
  <NuiTable
    v-model:expanded="expanded"
    :columns="columns"
    :rows="departments"
    :get-key="keyOf"
    :get-children="childrenOf"
    caption="Headcount by department"
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
    name: 'Engineering',
    people: 14,
    children: [
      { name: 'Frontend', people: 6 },
      { name: 'Backend', people: 8 },
    ],
  },
  { name: 'Design', people: 4 },
  { name: 'Support', people: 5, children: [{ name: 'First line', people: 5 }] },
];

const columns: NuiTableColumn<Unit>[] = [
  { key: 'name', label: 'Department' },
  { key: 'people', label: 'People', align: 'end', width: 128 },
];

const keyOf = (unit: Unit): string => unit.name;
const childrenOf = (unit: Unit): readonly Unit[] | undefined => unit.children;
const expanded = ref<Unit[]>([departments[0]].filter((unit): unit is Unit => unit !== undefined));
</script>
