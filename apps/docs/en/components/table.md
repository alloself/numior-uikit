# Table

`NuiTable` is a table on a Vue-free engine: `columns` describes the columns with their value
type, `rows` brings the rows, `getKey` gives the key. Sorting lives in `v-model:sort`, filters
in `v-model:filters`, groups in `v-model:groupBy`, row selection in `v-model:selected`. Without
`height` the table grows with its rows, with `height` it renders only a window of rows and
columns.

<Example name="table/Basic" />

## Installation

```ts
import { NuiTable } from '@numior/table';
import '@numior/vue/styles.css';
import '@numior/table/styles.css';
```

The table draws its filters, column menu, checkboxes, pagination and skeletons with kit
components, so it needs the kit styles.

## Examples

### Custom cells and row selection

The `cell-<key>` and `header-<key>` slots replace a cell and a column label. `selectable` adds
a checkbox column and, in `multiple` mode, a select-all checkbox in the header for the rows in
view.

<Example name="table/Cells" />

### Filters and totals

The column type picks the filter: text, number, date or a value set through `filter: 'set'`;
`v-model:quick` searches every text column. A column with `aggregate` brings a totals row with
the `totalsLabel` caption and the count of filtered rows.

<Example name="table/Filters" />

### Groups

`v-model:groupBy` gathers rows into groups by column keys, and aggregates are computed for
every group. A column group `{ key, label, children }` draws a band above its headers.

<Example name="table/Groups" />

### Pages

`pagination` puts a `NuiPagination` under the scroll area; `remote` with `total` leaves the
table only the rendering and the events.

<Example name="table/Pages" />

### A row tree

`getChildren` enables the tree: a row with children gets a toggle and a level indent, the
expanded keys live in `v-model:expanded`. `hasChildren` marks a row whose children are not
loaded yet: on expand the table emits `load` and waits for them.

<Example name="table/Tree" />

### Row drag

`rowDrag` shows a grip in the first column of a row. The top of a target row drops the row
before it, the bottom after it, and holding over the middle for `nestDelay` nests it inside.
The `reorder` event carries the indices and both parents; the grips switch off while the table
is sorted, filtered or grouped.

<Example name="table/Drag" />

### Ranges and clipboard

Dragging with the mouse selects a rectangle of cells, Shift stretches it from the active cell and
Ctrl adds another one. Ctrl+C copies the selection as tab separated text and an HTML table, so a
paste into Excel or Google Sheets keeps the grid.

The right button, Shift+F10 or a long press open the cell menu. The `contextMenu` function adds its
items after the copy items, and `v-model:ranges` keeps the selection.

<Example name="table/Ranges" />

### Ten thousand rows

`height` turns on the row and column windows of `rowHeight` rows. A column with `pin` stays in
place while scrolling, `pinnedRows` stay under the header, and the column menu pins and hides
columns.

The window rows sit on sticky cells that the browser keeps in place while the scrollbar is
dragged. Rows are reused element by element, so the body never goes blank between frames.

<Example name="table/Windowed" />

## Behaviour

`column.value(row)` gives the cell value, and the column type picks the comparison, the filter
and the aggregates. Numbers and dates compare numerically, strings by locale, `null` goes last.

Sorting, filters and groups run in slices with progress, and the `settle` event reports the row
count. Select-all checks the rows in view after filters, `loading` draws skeletons, empty `rows`
show [Empty](/en/components/empty) or the `empty` slot.

The handle at the header edge drags the column width, a group's handle drags its outer column,
and `v-model:widths` keeps it by key. While the table fits, the width moves to the neighbouring
column; once it scrolls, only the column itself grows. `Alt` with the arrow keys does the same
from the keyboard, and the column menu resets the width.

The grip at the start of a header drags the column inside its pane, and `v-model:columnOrder`
keeps the key order. `Alt+Shift` with the arrows moves a column from the keyboard, and on a row
moves it among its siblings. The right arrow nests a row into the previous sibling and the left
one lifts it after its parent.

## Accessibility

The markup is a `role="grid"` grid, `treegrid` for trees and groups, with one tab stop: focus
moves between cells with the arrow keys. `aria-rowindex` and `aria-colindex` count the rows
outside the window too, headers carry `aria-sort`, rows `aria-selected`, `aria-expanded` and
`aria-level`. Checkboxes and menu buttons take their names from the dictionary.

Cells inside ranges carry `aria-selected`, and the live region announces the selection size and
the result of a copy.

<KeyboardReference name="NuiTable" />

## API

<ApiReference name="NuiTable" />
