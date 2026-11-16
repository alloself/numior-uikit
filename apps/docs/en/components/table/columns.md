# Columns and rows

Drag or use the keyboard to resize columns and to reorder columns and rows.

## Column widths

Drag the edge of a column header to change its width; widths are kept in `v-model:widths` by
column key. The edge of a group header changes the width of the last column in the group.

`width` sets the starting width in pixels, and `minWidth` and `maxWidth` set its limits. Columns
with `flex` split the free space by their shares until their width is changed by hand.
`resizable: false` removes the width handle and keys of a column.

A column is never narrower than the buttons in its header: the move grip, sorting, the filter and
the menu. A smaller `width` or `minWidth` grows to that width. Buttons a column does not have, for
example with `reorderable: false` or `sortable: false`, take no room.

The filter button takes room while a filter is set or open, and always in a table without the
column menu. The number of a sort key takes room while the table sorts by several columns.

While the table fits its width, a column grows at the expense of its neighbor. Once a horizontal
scroll appears, only the column itself grows.

On the keyboard `Alt` with the arrows changes the width, and the column menu resets it.

## Column and row order

Drag a column by the handle at the start of its header; the key order is kept in
`v-model:columnOrder`. Pinned columns move only among pinned ones, the rest among the rest.
`reorderable: false` keeps a column in place: it has no grip, and the keys do not move it.

On the keyboard `Alt+Shift` with the left and right arrows moves a column. On a row `Alt+Shift`
with the up and down arrows moves it among its neighbors.

`Alt+Shift` with the right arrow makes the row a child of its previous sibling, and the left arrow
places it right after its parent.

## Dragging rows

The `rowDrag` prop adds a drag handle to the first column. Over the top half of another row the
dragged row goes before it, over the bottom half after it. Holding it over the middle for longer
than `nestDelay` makes it a child.

The table emits the `reorder` event with the indices and both parents, and the application moves
the rows. The handles are disabled with `source` or `remote`, while loading, and while the table is
sorted, filtered, grouped or searched with `v-model:quick`.

<Example name="table/Drag" />
