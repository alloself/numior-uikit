# Таблица

`NuiTable` — нативная `<table>` без `role="grid"`: колонки описываются `columns` (`key`,
`label`, `sortable`, `align`, `width`, `value`, `sort`), строки приходят в `rows`, ключ строки
даёт `getKey`. Сортировка живёт в `v-model:sort` (клик по заголовку: по возрастанию → по
убыванию → сброс), выбор строк — в `v-model:selected` через `NuiCheckbox` с трёхсостоянной
шапкой, страницы — в `v-model:page`/`v-model:pageSize` с `NuiPagination` в футере. По умолчанию
таблица сортирует и режет страницы сама; `remote` с `total` оставляет ей только рендер и
события. Слоты `cell-<key>`, `header-<key>`, `empty`, `loading`, `caption`; `virtual` с
`height` включает виртуализацию строк вместо пагинации.

<script setup>
import { ref } from 'vue'
const people = [
  { id: 1, name: 'Анна', role: 'Дизайн', age: 34, score: 88 },
  { id: 2, name: 'Борис', role: 'Разработка', age: 28, score: null },
  { id: 3, name: 'Вера', role: 'Разработка', age: 45, score: 92 },
  { id: 4, name: 'Глеб', role: 'Тесты', age: 23, score: 71 },
  { id: 5, name: 'Дина', role: 'Дизайн', age: 39, score: 65 },
  { id: 6, name: 'Егор', role: 'Разработка', age: 31, score: 79 },
  { id: 7, name: 'Жанна', role: 'Поддержка', age: 52, score: 84 },
]
const columns = [
  { key: 'name', label: 'Имя', sortable: true },
  { key: 'role', label: 'Роль' },
  { key: 'age', label: 'Возраст', sortable: true, align: 'end', width: '7rem' },
  { key: 'score', label: 'Балл', sortable: true, align: 'end', width: '6rem' },
]
const many = Array.from({ length: 3000 }, (_, i) => ({ id: i + 1, name: `Сотрудник ${i + 1}`, role: 'Разработка', age: 20 + (i % 40), score: i % 100 }))
const sort = ref(null)
const selected = ref([])
const pagination = { pageSizes: [5, 10], label: 'Страницы', previousLabel: 'Предыдущая', nextLabel: 'Следующая', pageSizeLabel: 'На странице', pageLabel: (p) => `Страница ${p}`, rangeLabel: (from, to, total) => `${from}–${to} из ${total}` }
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light" style="max-inline-size: none">
  <NuiTable v-model:sort="sort" v-model:selected="selected" :columns="columns" :rows="people" :get-key="(row) => String(row.id)" :page-size="5" selectable="multiple" :pagination="pagination" caption="Команда" hoverable striped empty-label="Нет данных" select-label="Выбрать строку" select-all-label="Выбрать все строки">
    <template #cell-role="{ value }"><NuiChip size="sm" tone="info">{{ value }}</NuiChip></template>
  </NuiTable>
  <NuiTable :columns="columns" :rows="many" :get-key="(row) => String(row.id)" virtual height="14rem" sticky-header size="sm" caption="3000 строк с виртуализацией" />
</div>

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { NuiTable, type NuiTableColumn, type NuiTableSort } from '@numior/vue';
import '@numior/vue/styles/table.css';

const columns: NuiTableColumn<Person>[] = [
  { key: 'name', label: 'Имя', sortable: true },
  { key: 'age', label: 'Возраст', sortable: true, align: 'end' },
];
const sort = ref<NuiTableSort>(null);
const selected = ref<Person[]>([]);
</script>

<template>
  <NuiTable
    v-model:sort="sort"
    v-model:selected="selected"
    :columns="columns"
    :rows="people"
    :get-key="(row) => String(row.id)"
    selectable="multiple"
    :pagination="{ pageSizes: [10, 20] }"
    caption="Команда"
  >
    <template #cell-name="{ row }"
      ><NuiLink :to="`/people/${row.id}`">{{ row.name }}</NuiLink></template
    >
  </NuiTable>
</template>
```

## Поведение

Значение ячейки — `column.value(row)` или `row[key]`; сравнение по умолчанию ставит `null`
и `undefined` в конец, числа и даты сравнивает численно, строки — `localeCompare` с числовым
режимом, `column.sort` заменяет его. Выбор «все» отмечает только видимые строки текущей
страницы, шапка показывает `indeterminate`, пока отмечена часть; в `single` строки ведут себя
как радиокнопки. `rowClick` не срабатывает от клика по ячейке с чекбоксом. `loading`
рисует `loadingRows` строк скелетонов и `aria-busy`; пустые `rows` показывают
[пустое состояние](/components/empty) или слот `empty`. Пагинация и виртуализация
взаимоисключающие: если задана `pagination`, `virtual` игнорируется.

## Доступность

Разметка остаётся таблицей: `<caption>`, `th[scope="col"]`, `aria-sort` на сортируемых
заголовках, кнопка сортировки с именем колонки внутри `th`, чекбоксы с именами из
`selectLabel`/`selectAllLabel`, `aria-selected` на выбранных строках. При виртуализации
таблица получает `aria-rowcount`, строки — `aria-rowindex`, а невидимые строки заменяются
пустыми распорками. Клавиатурной навигации по ячейкам нет: это область DataGrid.

## Виртуализация

`virtual` с `height` рендерит только строки в окне скроллера высотой `rowHeight` (40px по
умолчанию) плюс запас, распорки сверху и снизу держат высоту прокрутки, `stickyHeader`
прижимает шапку. Фокус на чекбоксе строки может уйти вместе со строкой при прокрутке —
для клавиатурной работы с выбором предпочтительнее пагинация.

## API

| Prop                                   | Тип                             | По умолчанию                        | Описание                              |
| -------------------------------------- | ------------------------------- | ----------------------------------- | ------------------------------------- |
| `columns`                              | `NuiTableColumn<T>[]`           | —                                   | Колонки                               |
| `rows`                                 | `T[]`                           | —                                   | Строки                                |
| `getKey`                               | `(row: T) => string`            | JSON                                | Ключ строки                           |
| `sort`                                 | `NuiTableSort`                  | `null`                              | `v-model:sort`                        |
| `selectable`                           | `'single' \| 'multiple'`        | —                                   | Выбор строк                           |
| `selected`                             | `T[]`                           | `[]`                                | `v-model:selected`                    |
| `pagination`                           | `NuiTablePagination \| boolean` | —                                   | Футер с `NuiPagination` и его пропами |
| `page`, `pageSize`                     | `number`                        | `1`, `20`                           | `v-model:page`, `v-model:pageSize`    |
| `remote`                               | `boolean`                       | `false`                             | Не сортировать и не резать самой      |
| `total`                                | `number`                        | `rows.length`                       | Всего строк в `remote`                |
| `loading`                              | `boolean`                       | `false`                             | Скелетоны и `aria-busy`               |
| `loadingRows`                          | `number`                        | `5`                                 | Число скелетонов                      |
| `emptyLabel`                           | `string`                        | `'No data'`                         | Заголовок пустого состояния           |
| `caption`                              | `string`                        | —                                   | Подпись таблицы                       |
| `stickyHeader`, `striped`, `hoverable` | `boolean`                       | `false`                             | Внешний вид                           |
| `size`                                 | `'sm' \| 'md' \| 'lg'`          | `'md'`                              | Высота строки                         |
| `virtual`, `height`, `rowHeight`       | `boolean`, `string`, `number`   | `false`, —, `40`                    | Виртуализация                         |
| `selectLabel`, `selectAllLabel`        | `string`                        | `'Select row'`, `'Select all rows'` | Имена чекбоксов                       |

Событие `rowClick(row, event)`. Слоты `cell-<key>` (`{ row, value, column, index }`),
`header-<key>` (`{ column, sort }`), `empty`, `loading`, `caption`. Блок `nui-table`,
модификаторы `--size-*`, `--striped`, `--hoverable`, `--sticky-header`, `--virtual`,
`--selectable`, `--loading`; элементы `__scroller`, `__table`, `__caption`, `__head`, `__body`,
`__row` (`--head`, `--selected`, `--status`, `--loading`), `__cell` (`--head`, `--select`,
`--status`, `--align-*`), `__sort` (`--active`, `--desc`), `__sort-icon`, `__spacer`, `__footer`;
переменные `--_row`, `--_pad-x`, `--_height`, `--_stripe`, `--_hover`, `--_head-bg`.
