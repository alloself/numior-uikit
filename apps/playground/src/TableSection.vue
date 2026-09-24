<template>
  <section class="panel" aria-labelledby="table-title">
    <div class="section-heading">
      <h2 id="table-title">Таблица</h2>
      <span class="tag">NuiTable · NuiPagination</span>
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
      :columns="columns"
      :rows="empty ? [] : people"
      :get-key="keyOf"
      selectable="multiple"
      :pagination="paginationLabels"
      :loading="loading"
      caption="Команда"
      hoverable
      striped
      empty-label="Нет данных"
      select-label="Выбрать строку"
      select-all-label="Выбрать все строки"
      data-testid="data-table"
      @row-click="onRowClick"
    >
      <template #cell-role="{ value }">
        <NuiChip size="sm" tone="info">{{ value }}</NuiChip>
      </template>
    </NuiTable>
    <NuiTable
      :columns="wideColumns"
      :rows="manyRows"
      :get-key="keyOf"
      virtual
      height="14rem"
      sticky-header
      size="sm"
      caption="5000 строк с виртуализацией"
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
  type NuiTableSort,
} from '@numior/vue';

interface Person {
  readonly id: number;
  readonly name: string;
  readonly role: string;
  readonly age: number;
  readonly city: string;
  readonly score: number | null;
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

const columns: NuiTableColumn<Person>[] = [
  { key: 'name', label: 'Имя', sortable: true },
  { key: 'role', label: 'Роль' },
  { key: 'age', label: 'Возраст', sortable: true, align: 'end', width: '7rem' },
  { key: 'score', label: 'Балл', sortable: true, align: 'end', width: '6rem' },
];
const wideColumns: NuiTableColumn<Person>[] = [
  { key: 'id', label: '№', width: '5rem', align: 'end' },
  { key: 'name', label: 'Имя', width: '12rem' },
  { key: 'role', label: 'Роль', width: '10rem' },
  { key: 'city', label: 'Город', width: '10rem' },
  { key: 'age', label: 'Возраст', width: '8rem', align: 'end' },
  { key: 'score', label: 'Балл', width: '8rem', align: 'end' },
  { key: 'team', label: 'Команда', width: '10rem', value: (row) => `Команда ${row.id % 9}` },
  {
    key: 'status',
    label: 'Статус',
    width: '8rem',
    value: (row) => (row.score === null ? '—' : 'ок'),
  },
];
const paginationLabels: NuiTablePagination = {
  pageSizes: [5, 10],
  label: 'Страницы',
  previousLabel: 'Предыдущая',
  nextLabel: 'Следующая',
  pageSizeLabel: 'На странице',
  pageLabel: (target) => `Страница ${target}`,
  rangeLabel: (from, to, total) => `${from}–${to} из ${total}`,
};

const keyOf = (row: Person): string => String(row.id);
const sort = ref<NuiTableSort>(null);
const selectedPeople = ref<Person[]>([]);
const page = ref(1);
const pageSize = ref(5);
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
    },
    null,
    2,
  ),
);
</script>
