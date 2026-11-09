# Table

`NuiTable` is a table for large data sets with sorting, filters, groups, row selection and cell
editing like in spreadsheets. It stays fast even with a million rows.

<Example name="table/Basic" />

Columns are described in `columns`, rows are passed in `rows`, and `getKey` returns the key of a
row. The column type (`text`, `number`, `date` or `boolean`) defines sorting, the filter and the
totals.

Sorting, filters, groups and selected rows are kept in the `v-model:sort`, `v-model:filters`,
`v-model:groupBy` and `v-model:selected` models. Without `height` the table grows to fit all rows,
and with `height` it scrolls and renders only the visible rows and columns.

## Installation

```ts
import { NuiTable } from '@numior/table';
import '@numior/vue/styles.css';
import '@numior/table/styles.css';
```

The filters, column menus, checkboxes and pagination of the table are `@numior/vue` components,
so their styles are needed too.

## Examples

### Custom cells and row selection

The `cell-<key>` slot replaces the content of the cells in a column, and `header-<key>` replaces
its header. The `selectable` prop adds a checkbox column for selecting rows.

With `multiple` the header gets a checkbox that selects all rows on screen.

<Example name="table/Cells" />

### Cell styles

The `bordered` prop draws lines between the columns, and the `cellStyle` function styles single
cells. It receives the row and the column and returns a `fill`, a text `color`, an `align`,
`borders` and text wrapping with `wrap`.

The fill lies over the row background, so a translucent color keeps the stripes and the hover
highlight visible. The `top`, `end`, `bottom` and `start` borders are drawn over the grid lines
and do not change the row height.

A border takes the place of a grid line, so the `top` of a cell and the `bottom` of the cell
above share one spot. In a merged cell the `top` and `start` borders are drawn inside it.

The `cellStyle` function is called once for every visible cell. It is called again when the row
changes or when reactive data that the function reads changes.

<Example name="table/CellStyle" />

### Row numbers

The `rowHeaders` prop adds a pinned column with row numbers before the data. The numbers follow
the order on screen, so sorting and filters do not break them. The `{ label, width }` options set
the label and width of the column.

A click on a number selects the whole row, and a click on the table corner selects the whole
table. A click on the header of a column with `sortable: false` selects the column.

Shift extends the selection, Ctrl adds a row or a column to it, and dragging over the numbers
selects several rows in a row. On the keyboard Space and Enter on a row number do the same.

The `resizable` option adds a handle at the bottom edge of a row number to change the row height.
Heights are kept in `v-model:rowHeights` by row key, and a double click on the handle restores
the default height.

On the keyboard `Alt` with the up and down arrows changes the height. With `height` the set
height is exact, and when rows grow with their content it is a minimum. Row heights have no
effect with `source`.

<Example name="table/RowHeaders" />

### Filters and totals

The filter in the column menu depends on the column type: text, number or date. With
`filter: 'set'` the filter offers a list of values to pick from. The `v-model:quick` model
searches all text columns at once.

A column with `aggregate` adds a totals row at the bottom, such as a sum or an average. The
totals row shows the `totalsLabel` caption and the number of rows left after filtering.

<Example name="table/Filters" />

### Groups

The `v-model:groupBy` model groups rows by column values, and totals are computed for each group.
Columns can share a common header when you describe a column group as `{ key, label, children }`.

<Example name="table/Groups" />

### Pages

The `pagination` prop shows a [Pagination](/en/components/pagination) under the table. With
`remote` and `total` the application handles sorting, filters and page changes, and the table
shows the rows and emits events.

<Example name="table/Pages" />

### Row tree

The `getChildren` function turns the table into a tree: a row with children gets an arrow, and
the children are indented. The keys of expanded rows are kept in `v-model:expanded`.

When the children are not loaded yet, mark the row with `hasChildren`. On expand the table emits
the `load` event and shows the children once they arrive. A click on the arrow expands the row
without moving the focus or selecting a cell.

<Example name="table/Tree" />

### Row details

The `detail` slot adds an arrow to the row, and an expanded row shows the slot content beneath it
across the full table width. The keys of expanded rows are kept in `v-model:expanded`, and
`hasDetail` keeps the arrow only on rows that have details.

The arrow keys pass through a details block, and Tab moves the focus inside it. Clicks, keys and
pastes inside the block go to its content, so a second table can live there.

Selection, copying and cell editing skip details blocks, and a page keeps the same number of
rows. With `height` the table counts the block height in the scroll. Details do not work in a row
tree.

<Example name="table/Detail" />

### Merged cells

The `merges` prop merges cells: each `{ from, to }` rectangle becomes one cell with the content
and style of its first cell. `wrap` from `cellStyle` wraps long text inside it.

Rows and columns are counted as in `v-model:ranges`: by the row number on the current page and
the position among visible data columns.

The cursor lands on a merged cell as a whole and leaves it from its far edge. A selection extends
to cover merged cells completely, while selections of whole rows and columns stay as they are.
An edit changes the value of the first cell.

When a merged cell reaches into a pinned column, it is split at the edge of that column. A cell
spanning several rows gets no hover or row selection highlight and no stripe color. Merging does
not work with grouping, in a tree or with row details.

<Example name="table/Merges" />

### Text over neighbouring cells

With `overflow` in `cellStyle` long text continues over the following empty cells, as in
spreadsheets. The text runs up to the first filled cell, a merged cell or the edge of the
pinned columns. Text aligned to the end of the line runs the other way.

The cells under the text stay separate: a click on the text over a neighbouring cell lands in
that cell. Grid lines under the text are not drawn.

<Example name="table/Overflow" />

### Frozen rows

The `frozenRows` prop keeps the first rows in place under the header while the rest scroll under
them. These are ordinary data rows: they can be selected, copied and edited.

Freezing works only with `height`. Groups, a tree, row details and `source` turn it off. Rows
that are not part of the data are pinned with `pinnedRows`.

<Example name="table/Frozen" />

### Sheet from cells

For an Excel-like sheet pass the result of `tableCells(source)` to the table. The source holds
the row count `rows`, the column count `cols` and the `cellAt(row, col)` function. That function
returns the text and style of a cell.

Sheet rows get numbers, and columns get letters from A to XFD. The table asks only for visible
cells and creates no objects per row or column. A sheet of 1 048 576 rows and 16 384 columns
therefore opens as fast as a small one.

Ctrl with an arrow moves to the edge of the data. When the storage knows where its empty areas
are, its `nextEdge` function finds the edge without walking over cells.

When data changes outside the table, for example after formulas are recalculated, call the
`invalidate(ranges)` method on the table ref. It redraws the rows of those ranges, or every row
without an argument.

<Example name="table/CellSource" />

### Layer over the cells

The `overlay` slot draws content over the cells that scrolls with them: reference highlights,
images, charts. The slot receives the `rectOf(range)` function, which returns the position of a
range, and `window` with the rendered rows and columns.

The header and pinned columns cover the layer, and clicks pass through it to the cells. The
table ref has the same `rectOf` and `cellFromPoint(x, y)`, which finds the cell under a point on
screen.

The layer takes row heights from `rowHeight` and the `rowHeights` model. It does not account for
rows that grew because of wrapped text.

<Example name="table/Overlay" />

### Dragging rows

The `rowDrag` prop adds a drag handle to the first column. Over the top half of another row the
dragged row goes before it, over the bottom half after it. Holding it over the middle for longer
than `nestDelay` makes it a child.

The table emits the `reorder` event with the indices and both parents, and the application moves
the rows. While the table is sorted, filtered or grouped, the handles are disabled.

<Example name="table/Drag" />

### Selection and clipboard

The `cellSelection` prop turns on cell selection; without it the table selects text like a
regular page.

Dragging with the mouse selects a rectangle of cells. Shift+click selects a rectangle from the
last clicked cell, and Ctrl+click adds a single cell. Shift or Ctrl on a selected cell removes it
from the selection.

After a double click on a cell that does not open an editor, a drag that starts in that cell
selects its text. A click on another cell, the arrow keys or Escape bring cell
selection back.

Escape clears the selection, and a click outside the table clears it too. Elements listed in
`keepEditing`, such as a formula bar, keep the selection. Selected ranges are kept in
`v-model:ranges`.

Ctrl+C copies the selection as tab-separated text and as an HTML table, so pasting into Excel or
Google Sheets keeps the cells.

The right mouse button, Shift+F10 or a long press open the cell menu. The `contextMenu` function
adds its own items after the copy item.

<Example name="table/Ranges" />

### Editing cells

A column with `editable` can be edited. Delete and Backspace clear the selected cells, and Ctrl+X
cuts them to the clipboard.

The table never changes `rows` itself: it emits an `edit` event with the list of changes, and the
application applies them. Ctrl+Z undoes the last edit, Ctrl+Shift+Z and Ctrl+Y redo it.

After an edit the row stays in place even when the column is sorted or filtered. Totals update
right away. Without `getKey` the edit history resets when `rows` change.

The `undo` and `redo` methods on the table ref undo and redo edits from code. To keep the history
in the application, pass `commands`, and every edit arrives in its `push`. Ctrl+Z and Ctrl+Y then
call its `undo()` and `redo()`.

Ctrl+V pastes tab-separated text starting at the active cell, and the pasted area becomes the
selection. A single value fills the whole selection, and whatever does not fit in the table is
dropped.

When the selection is a whole multiple of the pasted block, the block repeats over it. Numbers,
dates and booleans are parsed by the column type, and `parse` sets custom parsing.

Enter, F2 or a double click opens the editor in the active cell, and typing starts the edit right
away. The editor depends on the column type: a text input, a number field or a date picker. A
boolean value toggles at once, without an editor.

Enter saves the value and moves down, Tab moves right, and Escape cancels the edit. On a phone a
double tap opens the editor. Pinned rows and group rows cannot be edited.

The `rules` from [forms](/en/guide/forms-validation) check the value before it is saved. The error
shows in the editor, and moving the focus away from an invalid value cancels the edit. Pasting and
clearing skip the cells that fail the rules.

<Example name="table/Edits" />

### Custom clipboard format

The `clipboard` prop defines what goes to the clipboard on copy and how a paste is parsed. The
`serialize` function receives the ranges, the rows and the column keys and returns text and HTML.
The `copyLimit` limit does not apply to it.

The `parse` function receives the text and HTML from the clipboard and the top left target cell,
and returns rows of cell values. The paste then goes on as usual: parsing by column type, rule
checks and a single undo step for the whole paste.

When `parse` returns `undefined`, the table parses the paste itself.

<Example name="table/Clipboard" />

### Custom editors

The `editor` field of a column sets a custom editor. The `tableEditor(NuiSelect, isString,
{ props })` helper checks the props against the component types, and `isString` checks that the
cell value suits the editor.

An editor can also be a key from the [control registry](/en/composables/controls), such as
`'select'` or `{ control, props }`. Such an editor is checked when it opens. The registry is set in
`createNuiConfig({ controls })` or in the `controls` prop of the table.

A list opens at once, and a picked value is saved without Enter. A date column passes and
receives an ISO string, like `NuiDatePicker`.

When the registry lacks the control or its props and value do not fit, the cell stays closed.
The table then emits the `editRefused` event.

<Example name="table/Editors" />

### Formula bar

The `active` and `draft` models connect the table to a field outside it. `active` holds the
active cell, and `draft` holds the cell and the value of the open editor. Writing a new value to
`draft` changes the text in the cell too.

The `startEdit('append', { focus: false })` method on the table ref opens the editor and leaves
the focus in the field. `startEdit('replace')` opens it with an empty value.
`commitEdit('down')` saves the edit, `cancelEdit()` cancels it, and the focus returns to the
table.

`focusCell({ row, col })` moves the focus into a cell from outside, for example from a name box.
It returns `false` for a position outside the table.

List in `keepEditing` the elements that can take the focus without ending the edit. Ctrl+Enter in
the editor writes the value to every selected cell in columns of the same type.

With `growEditor` the editor sits exactly on the bounds of its cell, wears the selection frame and
keeps the fill and text colour of the cell. Once the text stops fitting, the editor grows over the
neighbouring cells by whole columns, as in Excel: towards the start for end-aligned cells and
towards the end for the rest. It stops at the edge of the visible area, and the text scrolls inside
the field.

<Example name="table/FormulaBar" />

### Cell references

The `picking(draft)` function tells whether the draft is waiting for a cell reference, for
example when it ends with `=`, a bracket or an operator. Clicks and drags over cells, taps on a
phone and arrows in the editor then pick cells instead of ending the edit.

Every pick arrives as the `pick` event with a range, and the application inserts the reference
into the draft. The `cellName` and `rangeName` helpers turn a range into an address such as `B2`
or `B2:C4`.

The table does not compute formulas. The `overlay` layer can highlight the cells a formula refers
to.

<Example name="table/Picking" />

### Export to CSV

The `exportCsv` method on the table ref exports to CSV the rows of all pages with filters and
sorting applied, in the visible columns only. Cells get the same text as on screen.

`separator` sets the delimiter, and `headers: false` removes the header line. A long export runs
in chunks, shows a progress bar and stops on `signal`.

Text that Excel would run as a formula (it starts with `=`, `@`, a tab, or with `+` or `-` and is
not a number) is exported with a leading apostrophe. `formulas: true` turns this protection off for
files read by a program instead of a person in a spreadsheet editor.

For Excel to open the file without garbled text, add a byte order mark at the start. Locales
with a decimal comma also expect the `;` delimiter, as in the example.

<Example name="table/Export" />

### Ten thousand rows

With `height` the table scrolls inside itself and renders only the visible rows of `rowHeight`
height and the visible columns. The table does not go blank on fast scrolling.

A column with `pin` stays in place on horizontal scroll, and rows from `pinnedRows` stay under
the header. A column can also be pinned or hidden from its menu.

<Example name="table/Windowed" />

With `rowHeight="auto"` each row is as tall as its content, and the table still renders only the
visible rows. Columns with `wrap` wrap their text.

The table measures rows as they appear on screen. While the scroll height settles, the row under
the header does not move.

<Example name="table/RowHeight" />

### Server data

The `source` prop loads rows from a server. The `fetch({ offset, limit, sort, filters, signal })`
function returns `{ rows, total }`, or `{ rows, hasMore }` when the total is unknown.

The table requests rows in blocks of `blockSize` as the user scrolls and keeps the last fifty
blocks. While a block is loading, placeholders stand in for its rows.

Sorting, filters and search run on the server, and outdated requests are cancelled through
`signal`. The `values` function returns the values for a list filter, and `totals` the totals
row.

Without `height` the table shows data page by page, one request per page. The `refresh()` method
on the table ref clears the cache, and a failed request arrives as the `error` event. CSV export
fetches the whole result a thousand rows per request.

<Example name="table/Source" />

With `v-model:groupBy` the server computes the groups: `fetch` receives the `groupBy` keys and the
`groupPath` to the expanded group. While the path is shorter than the list of keys, return
`{ groups }` with the value, row count and totals of each group. At the last level return the
rows of the group.

Groups start collapsed, and the keys of expanded ones are kept in `v-model:expanded`. While the
rows of an expanded group are loading, placeholders stand in for them.

<Example name="table/SourceGroups" />

To load a tree from the server, set `source.children`: the function receives a row and returns
its children. Mark rows with children with `hasChildren`, and the children load when the row is
expanded.

While the children are loading, a placeholder shows under the row. CSV export of a tree takes
only the top-level rows.

<Example name="table/SourceTree" />

## Behaviour

`column.value(row)` returns the cell value. Numbers and dates sort by size, strings
alphabetically in the current language, and empty `null` values go last.

On large data sorting, filters and grouping run in parts and show progress. When the work is
done, the `settle` event arrives with the row count.

The select-all checkbox selects the rows visible after filtering. The `loading` prop shows
placeholders instead of rows, and empty `rows` show [Empty](/en/components/empty) or the `empty`
slot.

### Column widths

Drag the edge of a column header to change its width; widths are kept in `v-model:widths` by
column key. The edge of a group header changes the width of the last column in the group.

While the table fits its width, a column grows at the expense of its neighbour. Once a horizontal
scroll appears, only the column itself grows.

On the keyboard `Alt` with the arrows changes the width, and the column menu resets it.

### Column and row order

Drag a column by the handle at the start of its header; the key order is kept in
`v-model:columnOrder`. Pinned columns move only among pinned ones, the rest among the rest.

On the keyboard `Alt+Shift` with the left and right arrows moves a column. On a row `Alt+Shift`
with the up and down arrows moves it among its neighbours.

`Alt+Shift` with the right arrow makes the row a child of its previous sibling, and the left arrow
places it right after its parent.

## Accessibility

The table is marked up as `role="grid"`, and a tree, groups and row details as `treegrid`. Tab
enters the table once, and the arrows move the focus between cells.

`aria-rowindex` and `aria-colindex` count rows that are not rendered at the moment. Headers report
the sorting through `aria-sort`, and rows report their state through `aria-selected`,
`aria-expanded` and `aria-level`.

Selected cells get `aria-selected`, and screen readers announce the selection size and the result
of a copy. Checkbox and menu button names come from the dictionary.

<KeyboardReference name="NuiTable" />

## API

<ApiReference name="NuiTable" />
