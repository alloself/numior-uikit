# Table

`NuiTable` is a native `<table>`: `columns` describes the columns, `rows` brings the rows,
`getKey` gives the key. Sorting lives in `v-model:sort`, row selection in `v-model:selected`,
pages in `v-model:page`; by default the table sorts and pages on its own.

<Example name="table/Basic" />

## Installation

```ts
import { NuiTable } from '@numior/vue';
import '@numior/vue/styles/checkbox.css';
import '@numior/vue/styles/pagination.css';
import '@numior/vue/styles/table.css';
```

## Examples

### Custom cells and row selection

The `cell-<key>` and `header-<key>` slots replace a cell and a column header; `selectable` adds
checkboxes with a tri-state header.

<Example name="table/Cells" />

### Pages

`pagination` puts a `NuiPagination` into the footer; `remote` with `total` leaves the table only
the rendering and the events.

<Example name="table/Pages" />

### Column width and order

`resizable` adds a handle at the header edge, `reorderable` a grip before the label. Widths
live in `v-model:widths` and the order in `v-model:columnOrder`; `sticky` pins a column to an
edge.

<Example name="table/Columns" />

### A row tree

`getChildren` enables the tree: rows with children get an expand button and a level indent, the
expanded ones live in `v-model:expanded`.

<Example name="table/Tree" />

### Virtualisation

`virtual` with `height` renders only the rows inside a scroller window of `rowHeight` rows,
`stickyHeader` pins the header. Pagination and virtualisation exclude each other.

<Example name="table/Virtual" />

## Behaviour

A cell value is `column.value(row)` or `row[key]`. The comparison puts `null` last, compares
numbers and dates numerically and strings by locale; `column.sort` replaces it.

"Select all" checks the visible rows of the current page. `loading` draws skeletons, empty
`rows` show [Empty](/en/components/empty) or the `empty` slot.

## Accessibility

The markup stays a table: `<caption>`, `th[scope="col"]`, `aria-sort` on sortable headers,
checkboxes named from the dictionary, `aria-selected` on selected rows. Under virtualisation
the table gets `aria-rowcount` and the rows `aria-rowindex`. There is no cell keyboard
navigation: that is DataGrid territory.

<KeyboardReference name="NuiTable" />

## API

<ApiReference name="NuiTable" />
