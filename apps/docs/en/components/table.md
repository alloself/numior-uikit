# Table

`NuiTable` is a native `<table>` without `role="grid"`: columns are described by `columns`
(`key`, `label`, `sortable`, `align`, `width`, `value`, `sort`), rows come from `rows` and
`getKey` names a row. Sorting lives in `v-model:sort` (a header click goes ascending →
descending → off), row selection in `v-model:selected` through `NuiCheckbox` with a
tri-state header, pages in `v-model:page`/`v-model:pageSize` with `NuiPagination` in the
footer. By default the table sorts and slices by itself; `remote` with `total` leaves it
only rendering and events. Slots `cell-<key>`, `header-<key>`, `empty`, `loading`, `caption`;
`virtual` with `height` windows the rows instead of paginating.

<script setup>
import { ref } from 'vue'
const people = [
  { id: 1, name: 'Alice', role: 'Design', age: 34, score: 88 },
  { id: 2, name: 'Bob', role: 'Engineering', age: 28, score: null },
  { id: 3, name: 'Cara', role: 'Engineering', age: 45, score: 92 },
  { id: 4, name: 'Dan', role: 'QA', age: 23, score: 71 },
  { id: 5, name: 'Eve', role: 'Design', age: 39, score: 65 },
  { id: 6, name: 'Finn', role: 'Engineering', age: 31, score: 79 },
  { id: 7, name: 'Gwen', role: 'Support', age: 52, score: 84 },
]
const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'role', label: 'Role' },
  { key: 'age', label: 'Age', sortable: true, align: 'end', width: '7rem' },
  { key: 'score', label: 'Score', sortable: true, align: 'end', width: '6rem' },
]
const many = Array.from({ length: 3000 }, (_, i) => ({ id: i + 1, name: `Employee ${i + 1}`, role: 'Engineering', age: 20 + (i % 40), score: i % 100 }))
const sort = ref(null)
const selected = ref([])
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light" style="max-inline-size: none">
  <NuiTable v-model:sort="sort" v-model:selected="selected" :columns="columns" :rows="people" :get-key="(row) => String(row.id)" :page-size="5" selectable="multiple" :pagination="{ pageSizes: [5, 10] }" caption="Team" hoverable striped>
    <template #cell-role="{ value }"><NuiChip size="sm" tone="info">{{ value }}</NuiChip></template>
  </NuiTable>
  <NuiTable :columns="columns" :rows="many" :get-key="(row) => String(row.id)" virtual height="14rem" sticky-header size="sm" caption="3000 windowed rows" />
</div>

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { NuiTable, type NuiTableColumn, type NuiTableSort } from '@numior/vue';
import '@numior/vue/styles/table.css';

const columns: NuiTableColumn<Person>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'age', label: 'Age', sortable: true, align: 'end' },
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
    caption="Team"
  >
    <template #cell-name="{ row }"
      ><NuiLink :to="`/people/${row.id}`">{{ row.name }}</NuiLink></template
    >
  </NuiTable>
</template>
```

## Columns: width, pinning, order

The column options `resizable`, `sticky` and `reorderable` switch on independently.
`resizable` adds a handle at the end edge of the header: drag it with a mouse or a finger,
or press ←/→ on the focused handle (`role="separator"` with `aria-valuenow`) for 10px steps,
50px with Shift, and Enter to restore the initial width. Widths live in `v-model:widths`
(`Record<key, px>`), start from `column.width` and stay within `minWidth` (64px) and
`maxWidth`. Columns without `width` are measured once in the automatic layout, then the
table switches to `table-layout: fixed`: on a narrow screen the columns keep their width and
the table scrolls horizontally. Free space is shared by the columns without `width`, so give
compact columns a width and let one column stretch. A header label in a narrow column is
truncated with an ellipsis and shows the full text in a tooltip, while body cells wrap. `sticky: 'start' | 'end'` pins a column to the scroller edge,
offsets are computed from the neighbouring pinned widths and the edge shadow appears only
once scrolled. `reorderable` lets you drag a header with the pointer or grab it from the
keyboard through the grip button: Space grabs, ←/→ move, Space drops, Escape cancels; the
order lives in `v-model:columnOrder` (keys) and pinned columns only move within their group.
The grip sits before the label, takes no space while hidden and pushes the header content
aside when it appears on hover or keyboard focus (touch screens always show it); while
dragging, the grips of the other columns and rows are hidden,
an opaque ghost with the column label follows the pointer, and the insertion line starts
below the `caption`. Every step is announced through `aria-live`, with `announce`
providing the text.

## Rows: tree, pinning, order

`getChildren(row)` turns on the tree: rows with children get an expand button
(`aria-expanded`) and a per-level indent (`indent`, 20px), expanded rows live in
`v-model:expanded`. `isExpandable(row)` declares a node expandable before its children are
loaded: expanding such a node emits `load` and spins until `getChildren` returns an array.
Sorting applies within each level, pagination and windowing work on the flat list of visible
rows and selection does not cascade. `pinnedRows` render in their own `tbody` under the
header, are never sorted or paged, and stay in place while scrolling under `stickyHeader`.
`rowDrag` adds a grip column: drag a row with the pointer or grab it from the keyboard
(Space, ↑/↓, Space, Escape) to move it among the siblings of one parent; the table emits
`reorder({ row, from, to, parent })` with sibling indices and the consumer updates the data.
While a sort is active the grips are disabled. The row grip shows on row hover, the row ghost
keeps the row height and carries the label from `rowLabel` or the first column. Utility
columns with checkboxes and grips are pinned to the start by default, so selection and
dragging stay at hand while the table scrolls horizontally.

## Behaviour

A cell value is `column.value(row)` or `row[key]`; the default comparison puts `null` and
`undefined` last, compares numbers and dates numerically and strings with a numeric
`localeCompare`, and `column.sort` replaces it. "Select all" checks only the visible rows of
the current page and the header shows `indeterminate` while only some are checked; in
`single` rows behave like radio buttons. `rowClick` does not fire from a click on the
checkbox cell. `loading` renders `loadingRows` skeleton rows and `aria-busy`; empty `rows`
show the [empty state](/en/components/empty) or the `empty` slot. Pagination and windowing
are exclusive: when `pagination` is set, `virtual` is ignored.

## Accessibility

The markup stays a table: `<caption>`, `th[scope="col"]`, `aria-sort` on sortable headers, a
sort button named after the column inside the `th`, checkboxes named by
`selectLabel`/`selectAllLabel` and `aria-selected` on selected rows. Under windowing the
table gets `aria-rowcount`, rows get `aria-rowindex` and the invisible rows are replaced by
empty spacers. There is no cell-by-cell keyboard navigation: that belongs to the DataGrid.

## Virtualisation

`virtual` with `height` renders only the rows inside the scroller window of `rowHeight`
(40px by default) plus overscan; spacers above and below keep the scroll height and
`stickyHeader` pins the header. Focus on a row checkbox may leave with its row when
scrolling, so pagination is the better fit for keyboard-heavy selection.

## API

| Prop                                   | Type                                  | Default                                          | Description                               |
| -------------------------------------- | ------------------------------------- | ------------------------------------------------ | ----------------------------------------- |
| `columns`                              | `NuiTableColumn<T>[]`                 | —                                                | Columns                                   |
| `rows`                                 | `T[]`                                 | —                                                | Rows                                      |
| `getKey`                               | `(row: T) => string`                  | JSON                                             | Row key                                   |
| `sort`                                 | `NuiTableSort`                        | `null`                                           | `v-model:sort`                            |
| `selectable`                           | `'single' \| 'multiple'`              | —                                                | Row selection                             |
| `selected`                             | `T[]`                                 | `[]`                                             | `v-model:selected`                        |
| `pagination`                           | `NuiTablePagination \| boolean`       | —                                                | Footer with `NuiPagination` and its props |
| `page`, `pageSize`                     | `number`                              | `1`, `20`                                        | `v-model:page`, `v-model:pageSize`        |
| `remote`                               | `boolean`                             | `false`                                          | Do not sort or slice locally              |
| `total`                                | `number`                              | `rows.length`                                    | Total rows in `remote`                    |
| `loading`                              | `boolean`                             | `false`                                          | Skeletons and `aria-busy`                 |
| `loadingRows`                          | `number`                              | `5`                                              | Number of skeleton rows                   |
| `emptyLabel`                           | `string`                              | [dictionary](/en/localization#table): “No data”  | Title of the empty state                  |
| `caption`                              | `string`                              | —                                                | Table caption                             |
| `stickyHeader`, `striped`, `hoverable` | `boolean`                             | `false`                                          | Look                                      |
| `size`                                 | `'sm' \| 'md' \| 'lg'`                | `'md'`                                           | Row height                                |
| `virtual`, `height`, `rowHeight`       | `boolean`, `string`, `number`         | `false`, —, `40`                                 | Windowing                                 |
| `widths`                               | `Record<string, number>`              | `{}`                                             | `v-model:widths`, px                      |
| `columnOrder`                          | `string[]`                            | `[]`                                             | `v-model:columnOrder`                     |
| `getChildren`                          | `(row: T) => T[] \| undefined`        | —                                                | Children of a row (tree)                  |
| `isExpandable`                         | `(row: T) => boolean`                 | by children                                      | Node expandable before loading            |
| `expanded`                             | `T[]`                                 | `[]`                                             | `v-model:expanded`                        |
| `indent`                               | `number`                              | `20`                                             | Indent per level, px                      |
| `pinnedRows`                           | `T[]`                                 | `[]`                                             | Rows under the header                     |
| `rowDrag`                              | `boolean`                             | `false`                                          | Grip column for row reordering            |
| `resizeLabel`, `reorderLabel`          | `(column) => string`                  | [dictionary](/en/localization#table)             | Names of the column handles               |
| `expandLabel`, `dragLabel`, `rowLabel` | `(row) => string`                     | [dictionary](/en/localization#table), first cell | Row button names and the announced label  |
| `announce`                             | `(a: NuiTableAnnouncement) => string` | [dictionary](/en/localization#table)             | `aria-live` text while reordering         |
| `selectLabel`, `selectAllLabel`        | `string`                              | [dictionary](/en/localization#table)             | Checkbox names                            |

Column options: `key`, `label`, `sortable`, `align`, `width` (px or CSS), `minWidth`,
`maxWidth`, `resizable`, `reorderable`, `sticky`, `value`, `sort`. Events
`rowClick(row, event)`, `reorder({ row, from, to, parent })`, `load(row)`. Slots `cell-<key>`
(`{ row, value, column, index }`), `header-<key>` (`{ column, sort }`), `empty`, `loading`,
`caption`. Block `nui-table`, modifiers `--size-*`, `--striped`, `--hoverable`,
`--sticky-header`, `--virtual`, `--selectable`, `--loading`, `--dragging`,
`--scrolled-start`, `--scrolled-end`; elements `__frame`, `__scroller`, `__table`, `__caption`, `__head`,
`__body` (`--pinned`), `__row` (`--head`, `--selected`, `--status`, `--loading`, `--dragging`),
`__cell` (`--head`, `--select`, `--drag`, `--tree`, `--status`, `--align-*`, `--sticky`,
`--sticky-start`, `--sticky-end`, `--sticky-edge`, `--resizing`, `--dragging`), `__sort`
(`--active`, `--desc`), `__sort-icon`, `__resizer`, `__grip`, `__toggle` (`--expanded`,
`--loading`, `--leaf`), `__drop` (`--column`, `--row`), `__ghost` (`--column`, `--row`),
`__ghost-grip`, `__ghost-label`, `__live`, `__spacer`, `__footer`; variables `--_row`,
`--_pad-x`, `--_height`, `--_stripe`, `--_hover`, `--_head-bg`, `--_indent`, `--_level`,
`--_head-size`, `--_caption-size`.
