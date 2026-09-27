# Table

`NuiTable` — нативная `<table>`: колонки описывает `columns`, строки приходят в `rows`, ключ
даёт `getKey`. Сортировка живёт в `v-model:sort`, выбор строк — в `v-model:selected`,
страницы — в `v-model:page`; по умолчанию таблица сортирует и режет страницы сама.

<Example name="table/Basic" />

## Установка

```ts
import { NuiTable } from '@numior/vue';
import '@numior/vue/styles/checkbox.css';
import '@numior/vue/styles/pagination.css';
import '@numior/vue/styles/table.css';
```

## Примеры

### Свои ячейки и выбор строк

Слоты `cell-<key>` и `header-<key>` заменяют ячейку и заголовок колонки; `selectable`
добавляет чекбоксы с трёхсостоянной шапкой.

<Example name="table/Cells" />

### Страницы

`pagination` включает `NuiPagination` в подвале; `remote` с `total` оставляет таблице только
рендер и события.

<Example name="table/Pages" />

### Ширина и порядок колонок

`resizable` добавляет ручку у края заголовка, `reorderable` — ручку перед подписью; ширины
живут в `v-model:widths`, порядок — в `v-model:columnOrder`, `sticky` прижимает колонку к
краю.

<Example name="table/Columns" />

### Дерево строк

`getChildren` включает дерево: строки с детьми получают кнопку раскрытия и отступ уровня,
раскрытые хранятся в `v-model:expanded`.

<Example name="table/Tree" />

### Виртуализация

`virtual` с `height` рендерит только строки в окне скроллера высотой `rowHeight`,
`stickyHeader` прижимает шапку. Пагинация и виртуализация взаимоисключающие.

<Example name="table/Virtual" />

## Поведение

Значение ячейки — `column.value(row)` или `row[key]`; сравнение ставит `null` в конец, числа
и даты сравнивает численно, строки — по локали, `column.sort` заменяет его. Выбор «все»
отмечает видимые строки текущей страницы. `loading` рисует скелетоны, пустые `rows` показывают
[Empty](/components/empty) или слот `empty`.

## Доступность

Разметка остаётся таблицей: `<caption>`, `th[scope="col"]`, `aria-sort` на сортируемых
заголовках, чекбоксы с именами из словаря, `aria-selected` на выбранных строках. При
виртуализации таблица получает `aria-rowcount`, а строки — `aria-rowindex`. Клавиатурной
навигации по ячейкам нет: это область DataGrid.

<KeyboardReference name="NuiTable" />

## API

<ApiReference name="NuiTable" />
