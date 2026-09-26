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
const pagination = { pageSizes: [5, 10] }
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light" style="max-inline-size: none">
  <NuiTable v-model:sort="sort" v-model:selected="selected" :columns="columns" :rows="people" :get-key="(row) => String(row.id)" :page-size="5" selectable="multiple" :pagination="pagination" caption="Команда" hoverable striped>
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

## Колонки: ширина, закрепление, порядок

Опции колонки `resizable`, `sticky` и `reorderable` включаются по отдельности.
`resizable` добавляет ручку у правого края заголовка: перетаскивание мышью или пальцем,
клавиши ←/→ на сфокусированной ручке (`role="separator"` с `aria-valuenow`) меняют ширину
на 10px, с Shift — на 50px, Enter возвращает исходную. Ширины живут в `v-model:widths`
(`Record<key, px>`), стартовое значение — `column.width`, пределы — `minWidth` (64px) и
`maxWidth`. Колонки без `width` один раз замеряются в авто-раскладке, после чего таблица
переходит на `table-layout: fixed`: на узком экране колонки не схлопываются, а таблица
прокручивается по горизонтали. Свободное место делят колонки без `width`, поэтому компактным
колонкам стоит задать ширину, а растягиваться оставить одну. Подпись заголовка в узкой
колонке обрезается многоточием и показывает полный текст в подсказке, а ячейки тела
переносятся по словам. `sticky: 'start' | 'end'` прижимает колонку к краю
скроллера, отступы считаются из ширин соседних закреплённых колонок, а тень на кромке
появляется только после прокрутки. `reorderable` позволяет тянуть заголовок мышью или
взять его кнопкой-ручкой с клавиатуры: Space берёт, ←/→ двигают, Space кладёт, Escape
отменяет; порядок хранится в `v-model:columnOrder` (ключи), закреплённые колонки меняются
местами только внутри своей группы. Ручка стоит перед подписью, не занимает места, пока
скрыта, и раздвигает заголовок при наведении на него и при фокусе с клавиатуры (на сенсорных
экранах она видна всегда); во время
перетаскивания ручки остальных колонок и строк скрыты, за указателем идёт непрозрачный
призрак с подписью колонки, а линия вставки начинается под `caption`. Каждое действие озвучивается через `aria-live`, текст задаёт `announce`.

## Строки: дерево, закрепление, порядок

`getChildren(row)` включает дерево: строки с детьми получают кнопку раскрытия
(`aria-expanded`) и отступ по уровню (`indent`, 20px), раскрытые хранятся в
`v-model:expanded`. `isExpandable(row)` объявляет узел раскрываемым до загрузки детей:
такой узел при раскрытии эмитит `load` и крутит спиннер, пока `getChildren` не вернёт
массив. Сортировка применяется внутри каждого уровня, пагинация и виртуализация работают по
плоскому списку видимых строк, выбор не каскадируется. `pinnedRows` рендерятся отдельным
`tbody` под шапкой, не сортируются и не режутся на страницы, а при `stickyHeader` остаются
на месте при прокрутке. `rowDrag` добавляет колонку с ручкой: строку можно перетащить
мышью или взять с клавиатуры (Space, ↑/↓, Space, Escape) и переставить среди соседей
одного родителя; таблица эмитит `reorder({ row, from, to, parent })` с индексами среди
соседей, а данные меняет потребитель. При активной сортировке ручки отключены. Ручка строки
видна при наведении на строку, призрак строки повторяет её высоту и несёт подпись из
`rowLabel` или первой колонки. Служебные колонки с чекбоксами и ручками закреплены у начала
по умолчанию: при горизонтальной прокрутке выбор и перетаскивание остаются под рукой.

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

| Prop                                   | Тип                                   | По умолчанию                                  | Описание                                   |
| -------------------------------------- | ------------------------------------- | --------------------------------------------- | ------------------------------------------ |
| `columns`                              | `NuiTableColumn<T>[]`                 | —                                             | Колонки                                    |
| `rows`                                 | `T[]`                                 | —                                             | Строки                                     |
| `getKey`                               | `(row: T) => string`                  | JSON                                          | Ключ строки                                |
| `sort`                                 | `NuiTableSort`                        | `null`                                        | `v-model:sort`                             |
| `selectable`                           | `'single' \| 'multiple'`              | —                                             | Выбор строк                                |
| `selected`                             | `T[]`                                 | `[]`                                          | `v-model:selected`                         |
| `pagination`                           | `NuiTablePagination \| boolean`       | —                                             | Футер с `NuiPagination` и его пропами      |
| `page`, `pageSize`                     | `number`                              | `1`, `20`                                     | `v-model:page`, `v-model:pageSize`         |
| `remote`                               | `boolean`                             | `false`                                       | Не сортировать и не резать самой           |
| `total`                                | `number`                              | `rows.length`                                 | Всего строк в `remote`                     |
| `loading`                              | `boolean`                             | `false`                                       | Скелетоны и `aria-busy`                    |
| `loadingRows`                          | `number`                              | `5`                                           | Число скелетонов                           |
| `emptyLabel`                           | `string`                              | [словарь](/localization#table): «Нет данных»  | Заголовок пустого состояния                |
| `caption`                              | `string`                              | —                                             | Подпись таблицы                            |
| `stickyHeader`, `striped`, `hoverable` | `boolean`                             | `false`                                       | Внешний вид                                |
| `size`                                 | `'sm' \| 'md' \| 'lg'`                | `'md'`                                        | Высота строки                              |
| `virtual`, `height`, `rowHeight`       | `boolean`, `string`, `number`         | `false`, —, `40`                              | Виртуализация                              |
| `widths`                               | `Record<string, number>`              | `{}`                                          | `v-model:widths`, px                       |
| `columnOrder`                          | `string[]`                            | `[]`                                          | `v-model:columnOrder`                      |
| `getChildren`                          | `(row: T) => T[] \| undefined`        | —                                             | Дети строки (дерево)                       |
| `isExpandable`                         | `(row: T) => boolean`                 | по детям                                      | Узел раскрываем до загрузки                |
| `expanded`                             | `T[]`                                 | `[]`                                          | `v-model:expanded`                         |
| `indent`                               | `number`                              | `20`                                          | Отступ уровня, px                          |
| `pinnedRows`                           | `T[]`                                 | `[]`                                          | Строки под шапкой                          |
| `rowDrag`                              | `boolean`                             | `false`                                       | Колонка с ручкой перестановки строк        |
| `resizeLabel`, `reorderLabel`          | `(column) => string`                  | [словарь](/localization#table)                | Имена ручек колонок                        |
| `expandLabel`, `dragLabel`, `rowLabel` | `(row) => string`                     | [словарь](/localization#table), первая ячейка | Имена кнопок строк и подпись в объявлениях |
| `announce`                             | `(a: NuiTableAnnouncement) => string` | [словарь](/localization#table)                | Текст `aria-live` при перестановке         |
| `selectLabel`, `selectAllLabel`        | `string`                              | [словарь](/localization#table)                | Имена чекбоксов                            |

Опции колонки: `key`, `label`, `sortable`, `align`, `width` (px или CSS), `minWidth`,
`maxWidth`, `resizable`, `reorderable`, `sticky`, `value`, `sort`. События
`rowClick(row, event)`, `reorder({ row, from, to, parent })`, `load(row)`. Слоты
`cell-<key>` (`{ row, value, column, index }`), `header-<key>` (`{ column, sort }`), `empty`,
`loading`, `caption`. Блок `nui-table`, модификаторы `--size-*`, `--striped`, `--hoverable`,
`--sticky-header`, `--virtual`, `--selectable`, `--loading`, `--dragging`,
`--scrolled-start`, `--scrolled-end`; элементы `__frame`, `__scroller`, `__table`, `__caption`, `__head`,
`__body` (`--pinned`), `__row` (`--head`, `--selected`, `--status`, `--loading`, `--dragging`),
`__cell` (`--head`, `--select`, `--drag`, `--tree`, `--status`, `--align-*`, `--sticky`,
`--sticky-start`, `--sticky-end`, `--sticky-edge`, `--resizing`, `--dragging`), `__sort`
(`--active`, `--desc`), `__sort-icon`, `__resizer`, `__grip`, `__toggle` (`--expanded`,
`--loading`, `--leaf`), `__drop` (`--column`, `--row`), `__ghost` (`--column`, `--row`),
`__ghost-grip`, `__ghost-label`, `__live`, `__spacer`, `__footer`; переменные `--_row`,
`--_pad-x`, `--_height`, `--_stripe`, `--_hover`, `--_head-bg`, `--_indent`, `--_level`,
`--_head-size`, `--_caption-size`.
