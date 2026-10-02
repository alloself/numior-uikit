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

Dragging with the mouse selects a rectangle of cells, Shift+click adds the rectangle from the last
clicked cell and Ctrl+click adds one cell. Shift or Ctrl on a selected cell takes it out of the
selection, so no cell lands in the model twice. While the table has focus, the active cell looks
like a one-cell selection.

Ctrl+C copies the selection as tab separated text and an HTML table, so a paste into Excel or
Google Sheets keeps the grid.

The right button, Shift+F10 or a long press open the cell menu. The `contextMenu` function adds its
items after the copy items, and `v-model:ranges` keeps the selection.

<Example name="table/Ranges" />

### Editing cells

A column with `editable` takes edits: Delete and Backspace clear the selected cells, and Ctrl+X cuts
them to the clipboard. The table never changes rows itself; it sends an `edit` event with the list
of changes, and the consumer applies them. Ctrl+Z undoes the last edit, Ctrl+Shift+Z and Ctrl+Y redo
it.

Rows stay in place after an edit even when the column is sorted or filtered. Totals update at once,
and without `getKey` the edit history resets when `rows` change. The `undo` and `redo` methods of
the table ref do the same from code.

Ctrl+V pastes a block of tab separated text at the active cell, and the pasted area becomes the
selection. A single value fills the whole selection, a block repeats over a multiple of its size,
and cells past the table edge are dropped. Numbers, dates and booleans are read by the column type,
and `parse` sets a reader of its own.

Enter, F2 or a double click opens the editor in the active cell, and typing starts the edit with the
first character. The editor follows the column type: a text input, a number field or a date picker,
while a boolean cell toggles at once. Enter saves the value and moves down, Tab moves right, and
Escape cancels the edit.

The `rules` of [forms](/en/guide/forms-validation) check the value before it is saved. An error stays
in the editor with a hint, and moving the focus away from a wrong value discards the edit. Paste and
clear skip the cells that break the rules.

On a phone a double tap opens the editor. Pinned rows and group rows are not edited.

<Example name="table/Edits" />

### Custom editors

A column takes its own editor from `editor`. The `tableEditor(NuiSelect, isString, { props })`
helper checks the props against the component types. A [control registry](/en/composables/controls)
key such as `'select'` or `{ control, props }` is checked when the editor opens.

The registry comes from `createNuiConfig({ controls })` or from the `controls` prop of the table. A
list opens at once, and a picked value is saved without Enter. A date column passes and receives an
ISO string, like `NuiDatePicker`.

When the props or the value do not fit the control, or the registry lacks it, the cell stays closed.
The table then sends the `editRefused` event.

<Example name="table/Editors" />

### Export to CSV

The `exportCsv` method of the table ref builds CSV from the rows after filters and sorting, from
every page and over the shown columns. Cells hold the shown text, `separator` sets the delimiter,
and `headers: false` drops the header line. A long export runs in chunks under the busy bar and
stops on `signal`.

Excel reads the file cleanly when it starts with a byte order mark, and locales with a decimal comma
expect the semicolon delimiter.

<Example name="table/Export" />

### Ten thousand rows

`height` turns on the row and column windows of `rowHeight` rows. A column with `pin` stays in
place while scrolling, `pinnedRows` stay under the header, and the column menu pins and hides
columns.

The row window is one sticky table that the browser scrolls on its own. When the scrollbar runs
past it, the table stays at the edge until the next frame, so the body never goes blank. Rows are
reused element by element.

<Example name="table/Windowed" />

### Server source

The `source` prop takes rows from a server: `fetch({ offset, limit, sort, filters, signal })`
returns `{ rows, total }`, or `{ rows, hasMore }` without a total. The table asks for blocks of
`blockSize` rows under the scroll window and keeps the last fifty blocks in a cache. While a block
is on its way, its rows show skeletons.

Sorting, filters and the quick search go to the server, and old requests are cancelled through
`signal`. The `values` and `totals` functions give the set filter values and the totals row.
Without `height` the table pages through the source, one request per page.

The `refresh()` method of the table ref drops the cache, and a failed request arrives as the
`error` event. CSV export downloads the whole query result in chunks of a thousand rows.

<Example name="table/Source" />

With `v-model:groupBy` the server computes the groups: `fetch` receives the `groupBy` keys and the
`groupPath` of the opened group. While the path is shorter than the keys, return `{ groups }` with
the value, the row count and the aggregates of each group. At the last level return the rows of
the group.

Groups start collapsed, and the opened ones live in `v-model:expanded`. The rows of an opened
group show skeletons while its block is on the way.

<Example name="table/SourceGroups" />

A server tree turns on with `source.children`: the function takes a row and returns its children.
`hasChildren` marks the rows with children, and they are requested when a row opens.

While the children are on the way, the row is busy and a skeleton row stands under it. CSV export
of a tree downloads the top level rows.

<Example name="table/SourceTree" />

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
