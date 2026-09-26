<template>
  <section class="panel" aria-labelledby="table-title">
    <div class="section-heading">
      <h2 id="table-title">Таблица</h2>
      <span class="tag">NuiTable · NuiPagination · useReorder</span>
    </div>
    <div class="data-row">
      <NuiButton
        size="sm"
        variant="outline"
        tone="neutral"
        data-testid="data-table-loading"
        @click="loading = !loading"
      >
        {{ loading ? 'Показать данные' : 'Показать загрузку' }}
      </NuiButton>
      <NuiButton
        size="sm"
        variant="outline"
        tone="neutral"
        data-testid="data-table-empty"
        @click="empty = !empty"
      >
        {{ empty ? 'Вернуть строки' : 'Очистить строки' }}
      </NuiButton>
    </div>
    <NuiTable
      v-model:sort="sort"
      v-model:selected="selectedPeople"
      v-model:page="page"
      v-model:page-size="pageSize"
      v-model:column-order="columnOrder"
      v-model:widths="widths"
      :columns="columns"
      :rows="empty ? [] : people"
      :get-key="keyOf"
      selectable="multiple"
      :pagination="tablePagination"
      :loading="loading"
      caption="Команда"
      hoverable
      striped
      data-testid="data-table"
      @row-click="onRowClick"
    >
      <template #cell-role="{ value }">
        <NuiChip size="sm" tone="info">{{ value }}</NuiChip>
      </template>
    </NuiTable>
    <NuiTable
      v-model:expanded="expanded"
      :columns="treeColumns"
      :rows="team"
      :get-key="keyOf"
      :get-children="childrenOf"
      :is-expandable="expandable"
      row-drag
      caption="Отделы: дерево, ленивая подгрузка и перестановка строк"
      :expand-label="(row) => `Раскрыть ${row.name}`"
      :drag-label="(row) => `Переставить ${row.name}`"
      :row-label="(row) => row.name"
      data-testid="data-table-tree"
      @load="loadChildren"
      @reorder="onReorder"
    />
    <NuiTable
      :columns="wideColumns"
      :rows="manyRows"
      :pinned-rows="pinned"
      :get-key="keyOf"
      virtual
      height="14rem"
      sticky-header
      size="sm"
      caption="5000 строк: виртуализация, закреплённые колонки и строка"
      data-testid="data-table-virtual"
    />
    <pre class="output" data-testid="table-output">{{ output }}</pre>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  NuiButton,
  NuiChip,
  NuiTable,
  type NuiTableColumn,
  type NuiTablePagination,
  type NuiTableReorderEvent,
  type NuiTableSort,
} from '@numior/vue';

interface Person {
  readonly id: number;
  readonly name: string;
  readonly role: string;
  readonly age: number;
  readonly city: string;
  readonly score: number | null;
  readonly children?: readonly Person[] | undefined;
}

const ROLES = ['Дизайн', 'Разработка', 'Тесты', 'Поддержка'];
const CITIES = ['Казань', 'Москва', 'Самара', 'Сочи'];

const person = (
  id: number,
  name: string,
  role: string,
  age: number,
  score: number | null,
): Person => ({
  id,
  name,
  role,
  age,
  city: CITIES[id % CITIES.length] ?? 'Казань',
  score,
});

const people: Person[] = [
  person(1, 'Анна', 'Дизайн', 34, 88),
  person(2, 'Борис', 'Разработка', 28, null),
  person(3, 'Вера', 'Разработка', 45, 92),
  person(4, 'Глеб', 'Тесты', 23, 71),
  person(5, 'Дина', 'Дизайн', 39, 65),
  person(6, 'Егор', 'Разработка', 31, 79),
  person(7, 'Жанна', 'Поддержка', 52, 84),
  person(8, 'Зоя', 'Тесты', 27, null),
  person(9, 'Иван', 'Разработка', 41, 95),
  person(10, 'Кира', 'Дизайн', 36, 58),
  person(11, 'Лев', 'Поддержка', 29, 77),
  person(12, 'Мария', 'Разработка', 48, 90),
];

const manyRows: Person[] = Array.from({ length: 5000 }, (_, index) =>
  person(
    index + 1,
    `Сотрудник ${index + 1}`,
    ROLES[index % ROLES.length] ?? 'Разработка',
    20 + (index % 40),
    index % 7 === 0 ? null : index % 100,
  ),
);

const pinned: Person[] = [person(0, 'Итого по отделу', '—', 0, 4321)];

const columns: NuiTableColumn<Person>[] = [
  { key: 'name', label: 'Имя', sortable: true, resizable: true, reorderable: true, minWidth: 120 },
  { key: 'role', label: 'Роль', width: 160, resizable: true, reorderable: true },
  {
    key: 'age',
    label: 'Возраст',
    sortable: true,
    align: 'end',
    width: 112,
    resizable: true,
    reorderable: true,
  },
  {
    key: 'score',
    label: 'Балл',
    sortable: true,
    align: 'end',
    width: 96,
    resizable: true,
    reorderable: true,
  },
];

const treeColumns: NuiTableColumn<Person>[] = [
  { key: 'name', label: 'Имя', sortable: true },
  { key: 'role', label: 'Роль' },
  { key: 'age', label: 'Возраст', sortable: true, align: 'end', width: 112 },
];

const wideColumns: NuiTableColumn<Person>[] = [
  { key: 'id', label: '№', width: 72, align: 'end', sticky: 'start' },
  { key: 'name', label: 'Имя', width: 192, sticky: 'start' },
  { key: 'role', label: 'Роль', width: 160 },
  { key: 'city', label: 'Город', width: 160 },
  { key: 'age', label: 'Возраст', width: 128, align: 'end' },
  { key: 'score', label: 'Балл', width: 128, align: 'end' },
  { key: 'team', label: 'Команда', width: 160, value: (row) => `Команда ${row.id % 9}` },
  {
    key: 'status',
    label: 'Статус',
    width: 128,
    sticky: 'end',
    value: (row) => (row.score === null ? '—' : 'ок'),
  },
];

const tablePagination: NuiTablePagination = { pageSizes: [5, 10] };

const keyOf = (row: Person): string => String(row.id);
const childrenOf = (row: Person): readonly Person[] | undefined => row.children;

const expandable = (row: Person): boolean =>
  row.children === undefined ? row.id === 300 : row.children.length > 0;

const team = ref<Person[]>([
  {
    ...person(100, 'Анна', 'Дизайн', 34, 88),
    children: [
      person(101, 'Айгуль', 'Дизайн', 26, 70),
      {
        ...person(102, 'Артём', 'Дизайн', 31, 75),
        children: [person(103, 'Ася', 'Дизайн', 22, 60)],
      },
    ],
  },
  person(200, 'Борис', 'Разработка', 28, null),
  person(300, 'Вера', 'Разработка', 45, 92),
]);

const expanded = ref<Person[]>([]);
const loaded = ref<string[]>([]);
const lastReorder = ref<string>();

const withRows = (rows: readonly Person[], id: number, update: (row: Person) => Person): Person[] =>
  rows.map((row) => {
    const next = row.id === id ? update(row) : row;
    return next.children ? { ...next, children: withRows(next.children, id, update) } : next;
  });

const moveWithin = (rows: readonly Person[], from: number, to: number): Person[] => {
  const next = [...rows];
  const [row] = next.splice(from, 1);
  if (row) {
    next.splice(to, 0, row);
  }
  return next;
};

const loadChildren = (row: Person): void => {
  setTimeout(() => {
    team.value = withRows(team.value, row.id, (entry) => ({
      ...entry,
      children: [person(301, 'Влад', 'Разработка', 24, 66), person(302, 'Галя', 'Тесты', 27, 71)],
    }));

    loaded.value = [...loaded.value, row.name];
  }, 400);
};

const onReorder = ({ row, from, to, parent }: NuiTableReorderEvent<Person>): void => {
  lastReorder.value = `${row.name}:${from}->${to}`;

  team.value = parent
    ? withRows(team.value, parent.id, (entry) => ({
        ...entry,
        children: moveWithin(entry.children ?? [], from, to),
      }))
    : moveWithin(team.value, from, to);
};

const sort = ref<NuiTableSort>(null);
const selectedPeople = ref<Person[]>([]);
const page = ref(1);
const pageSize = ref(5);
const columnOrder = ref<string[]>([]);
const widths = ref<Record<string, number>>({});
const loading = ref(false);
const empty = ref(false);
const lastRowClick = ref<string>();

const onRowClick = (row: Person): void => {
  lastRowClick.value = row.name;
};

const output = computed(() =>
  JSON.stringify(
    {
      sort: sort.value,
      selected: selectedPeople.value.map((entry) => entry.name),
      page: page.value,
      pageSize: pageSize.value,
      lastRowClick: lastRowClick.value ?? null,
      loading: loading.value,
      empty: empty.value,
      columnOrder: columnOrder.value,
      widths: widths.value,
      expanded: expanded.value.map((entry) => entry.name),
      loaded: loaded.value,
      lastReorder: lastReorder.value ?? null,
      teamOrder: team.value.map((entry) => entry.name),
    },
    null,
    2,
  ),
);
</script>
