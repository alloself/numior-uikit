# Columns and rows

Drag or use the keyboard to resize columns and to reorder columns and rows.

## Column widths

Drag the edge of a column header to change its width; widths are kept in `v-model:widths` by
column key. The edge of a group header changes the width of the last column in the group.

While the table fits its width, a column grows at the expense of its neighbour. Once a horizontal
scroll appears, only the column itself grows.

On the keyboard `Alt` with the arrows changes the width, and the column menu resets it.

## Column and row order

Drag a column by the handle at the start of its header; the key order is kept in
`v-model:columnOrder`. Pinned columns move only among pinned ones, the rest among the rest.

On the keyboard `Alt+Shift` with the left and right arrows moves a column. On a row `Alt+Shift`
with the up and down arrows moves it among its neighbours.

`Alt+Shift` with the right arrow makes the row a child of its previous sibling, and the left arrow
places it right after its parent.

## Dragging rows

The `rowDrag` prop adds a drag handle to the first column. Over the top half of another row the
dragged row goes before it, over the bottom half after it. Holding it over the middle for longer
than `nestDelay` makes it a child.

The table emits the `reorder` event with the indices and both parents, and the application moves
the rows. While the table is sorted, filtered or grouped, the handles are disabled.

<Example name="table/Drag" />
