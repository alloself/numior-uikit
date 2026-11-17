<template>
  <NuiTable
    v-model:expanded="expanded"
    :columns="columns"
    :source="source"
    :get-key="keyOf"
    :has-children="hasChildren"
    caption="Отделы на сервере"
    height="18rem"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiTable,
  type NuiTableColumn,
  type TableNodeId,
  type TableSource,
} from '@numior/kit/table';

interface Unit {
  readonly id: string;
  readonly name: string;
  readonly people: number;
  readonly parent: string | null;
}

const units: readonly Unit[] = [
  { id: 'sales', name: 'Продажи', people: 42, parent: null },
  { id: 'sales-home', name: 'Россия', people: 18, parent: 'sales' },
  { id: 'sales-capital', name: 'Москва', people: 11, parent: 'sales-home' },
  { id: 'sales-regions', name: 'Регионы', people: 7, parent: 'sales-home' },
  { id: 'sales-abroad', name: 'Казахстан', people: 24, parent: 'sales' },
  { id: 'dev', name: 'Разработка', people: 64, parent: null },
  { id: 'dev-web', name: 'Веб', people: 38, parent: 'dev' },
  { id: 'dev-mobile', name: 'Мобильные приложения', people: 26, parent: 'dev' },
  { id: 'support', name: 'Поддержка', people: 15, parent: null },
];

const childrenOf = (parent: string | null): Unit[] =>
  units.filter((unit) => unit.parent === parent);

const wait = (signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, 300);

    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });

const expanded = ref<readonly TableNodeId[]>([]);

const source: TableSource<Unit> = {
  fetch: async ({ offset, limit, signal }) => {
    await wait(signal);

    const roots = childrenOf(null);

    return { rows: roots.slice(offset, offset + limit), total: roots.length };
  },
  children: async ({ row, signal }) => {
    await wait(signal);
    return childrenOf(row.id);
  },
};

const hasChildren = (unit: Unit): boolean => units.some((entry) => entry.parent === unit.id);

const columns: NuiTableColumn<Unit>[] = [
  {
    key: 'name',
    label: 'Подразделение',
    type: 'text',
    width: 260,
    flex: 1,
    sortable: false,
    filter: false,
    value: (row) => row.name,
  },
  {
    key: 'people',
    label: 'Сотрудники',
    type: 'number',
    width: 140,
    sortable: false,
    filter: false,
    value: (row) => row.people,
  },
];

const keyOf = (unit: Unit): string => unit.id;
</script>
