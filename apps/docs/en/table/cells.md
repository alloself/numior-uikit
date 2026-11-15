# Cells

Merged cells and long text that runs over empty neighbors make the table read like an Excel sheet.

## Merged cells

The `merges` prop merges cells: each `{ from, to }` rectangle becomes one cell with the content
and style of its first cell. `wrap` from `cellStyle` wraps long text inside it.

Rows and columns are counted as in `v-model:ranges`: by the row number on the current page and
the position among visible data columns.

The cursor lands on a merged cell as a whole and leaves it from its far edge. A selection extends
to cover merged cells completely, while selections of whole rows and columns stay as they are.
An edit changes the value of the first cell.

Paste, fill and clear leave the cells under a merged cell alone: their values are not seen. A paste
counts such cells as skipped.

When your own `commands` takes the edits, a block arrives whole with its `area`. The owner of the
data then decides what happens to the merges.

When a merged cell reaches into a pinned column, it is split at the edge of that column. A cell
spanning several rows gets no hover or row selection highlight and no stripe color. Merging does
not work with grouping, in a tree or with row details.

<Example name="table/Merges" />

## Text over neighboring cells

With `overflow` in `cellStyle` long text continues over the following empty cells, as in
spreadsheets. The text runs up to the first filled cell, a merged cell or the edge of the
pinned columns. Text aligned to the end of the line runs the other way.

Centered text spreads to both sides, and `wrap` wraps the text inside its cell. A cell with its
own slot, a tree, detail or drag grip, or an open editor keeps its text inside.

The cells under the text stay separate: a click on the text over a neighboring cell lands in
that cell. Grid lines under the text are not drawn.

<Example name="table/Overflow" />

## Frozen rows

The `frozenRows` prop keeps the first rows in place under the header while the rest scroll under
them. These are ordinary data rows: they can be selected, copied and edited.

Freezing works only with `height`. Groups, a tree, row details and `source` turn it off. Rows
that are not part of the data are pinned with `pinnedRows`.

<Example name="table/Frozen" />

## Sheet from cells

For an Excel-like sheet pass the result of `tableCells(source)` to the table. The source holds
the row count `rows`, the column count `cols` and the `cellAt(row, col)` function. That function
returns the text and style of a cell.

Sheet rows get numbers, and columns get letters from A to XFD. The table asks only for visible
cells and creates no objects per row or column.

Ctrl with an arrow moves to the edge of the data. When the storage knows where its empty areas
are, its `nextEdge` function finds the edge without walking over cells. Its `lastCell` function
names the last used cell, and Ctrl+End goes there instead of the last cell of the sheet.

When data changes outside the table, for example after formulas are recalculated, call the
`invalidate(ranges)` method on the table ref. It redraws the rows of those ranges, or every row
without an argument.

<Example name="table/CellSource" />

## Layer over the cells

The `overlay` slot draws content over the cells that scrolls with them: reference highlights,
images, charts. The slot receives the `rectOf(range)` function, which returns the position of a
range, and `window` with the rendered rows and columns.

The slot renders in the scrolling part of the table and again in the pinned columns and the
`frozenRows` rows, and `pane` names the part. The header covers the layer, and clicks pass through
it to the cells. The table ref has the same `rectOf` and `cellFromPoint(x, y)`, which finds the
cell under a point on screen.

The layer takes row heights from `rowHeight` and the `rowHeights` model. In a table without
`height` and with `rowHeight="auto"` it places marks by the measured rows, including rows that grew
because of wrapped text. Pinned rows of a table without `height` are not measured.

<Example name="table/Overlay" />

## Peer frames

`NuiTablePeers` draws frames in the `overlay` layer around the cells other people work in, with
their names. Each person needs a `key`, a `name`, a `colour` number and a `cell`, and `areas` adds
their selection. On the first row the name sits under the frame so the header does not cover it.

Keep the cell of a person by its row key and column key: the row number changes with sorting and
filters. `keyOf(position)` on the table ref returns such a key. `positionOf(key)` finds the cell in
the current view, or returns `undefined` for a row hidden by a filter.

A computed value over `positionOf` updates itself when the rows move.

`tableRectStyle(rect)` gives the position styles for your own marks in the layer.

<Example name="table/Peers" />
