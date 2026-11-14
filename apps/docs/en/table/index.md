# Table

A table for large data sets whose cells people edit the way they would in a spreadsheet.

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

## Usage

Change the row density, borders and stripes, then turn on row selection and row numbers.

<Configurator name="NuiTable" />

## Custom cells and row selection

The `cell-<key>` slot replaces the content of the cells in a column, and `header-<key>` replaces
its header. The `selectable` prop adds a checkbox column for selecting rows.

With `multiple` the header gets a checkbox that selects all rows on screen.

<Example name="table/Cells" />

## Cell styles

The `gridlines` prop draws lines between the columns, and the `cellStyle` function styles single
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

## Row numbers

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

The `rowResize` event reports a finished change of a height: the end of a drag, a keyboard step
or a reset. It is the place to save a height once per gesture.

<Example name="table/RowHeaders" />

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
