# Data

The table sorts and filters rows in the browser, and with `source` it hands that work to your server.

`column.value(row)` returns the cell value. Numbers and dates sort by size, strings
alphabetically in the current language, and empty `null` values go last. `sortable: false` turns
sorting off for a column.

`format(value, row)` turns the value into the cell text. Group labels, totals and the filter list
have no row, so `undefined` comes in its place.

On large data sorting, filters and grouping run in parts and show progress. When the work is
done, the `settle` event arrives with the row count.

The select-all checkbox selects the rows visible after filtering. The `loading` prop shows
placeholders instead of rows, and empty `rows` show [Empty](/en/components/empty) or the `empty`
slot.

## Filters and totals

The filter in the column menu depends on the column type: text, number, date, or a list of values
for `boolean`. The `filter` field picks another filter (`text`, `number`, `date` or `set`), and
`false` removes it. With `filter: 'set'` the filter offers a list of values to pick from.

The `v-model:quick` model searches all text columns at once.

A long list shows the first hundred values, and the search above the list finds the rest. "Select
all" with a box unchecked afterwards gives a filter with `exclude: true`: it hides the named
values, and values that appear later stay visible.

The list is marked busy while its values are gathered. If gathering takes a while, "Loading the
values…" stands in its place.

A column with `aggregate` adds a totals row at the bottom, such as a sum or an average. The
totals row shows the `totalsLabel` caption and the number of rows left after filtering.

A number column computes `sum`, `count`, `avg`, `min` and `max`, a date column `min`, `max` and
`count`, and text and boolean columns `count`. A custom function works for a column of any type.

<Example name="table/Filters" />

## Groups

The `v-model:groupBy` model groups rows by column values, and totals are computed for each group.
Columns can share a common header when you describe a column group as `{ key, label, children }`.

A group label sits in the column the rows are grouped by, and each nested level sits in its own
column. Place that column near the start so the label stays in view on a phone.

<Example name="table/Groups" />

## Pages

The `pagination` prop shows a [Pagination](/en/components/pagination) under the table. With
`remote` and `total` the application handles sorting, filters and page changes, and the table
shows the rows and emits events.

<Example name="table/Pages" />

## Row tree

The `getChildren` function turns the table into a tree: a row with children gets an arrow, and
the children are indented. The keys of expanded rows are kept in `v-model:expanded`.

When the children are not loaded yet, mark the row with `hasChildren`. On expand the table emits
the `load` event and shows the children once they arrive. A click on the arrow expands the row
without moving the focus or selecting a cell.

The totals row of a tree counts every row left after the filters, collapsed ones included. The
parents of found rows stay in the tree and count too.

<Example name="table/Tree" />

## Row details

The `detail` slot adds an arrow to the row, and an expanded row shows the slot content beneath it
across the full table width. The keys of expanded rows are kept in `v-model:expanded`, and
`hasDetail` keeps the arrow only on rows that have details.

The arrow keys pass through a details block, and Tab moves the focus inside it. Clicks, keys and
pastes inside the block go to its content, so a second table can live there.

Selection, copying and cell editing skip details blocks, and a page keeps the same number of
rows. With `height` the table counts the block height in the scroll. Details do not work in a row
tree.

<Example name="table/Detail" />

## Ten thousand rows

With `height` the table scrolls inside itself and renders only the visible rows of `rowHeight`
height and the visible columns.

A column with `pin: 'start'` or `pin: 'end'` stays in place on horizontal scroll, and rows from
`pinnedRows` stay under the header. A column can also be pinned or hidden from its menu, and
`hideable: false` keeps it from being hidden. The column the rows are grouped by cannot be hidden
until the grouping is removed.

<Example name="table/Windowed" />

With `rowHeight="auto"` each row is as tall as its content, and the table still renders only the
visible rows. Columns with `wrap` wrap their text.

The table measures rows as they appear on screen. While the scroll height settles, the row under
the header does not move.

<Example name="table/RowHeight" />

## Server data

The `source` prop loads rows from a server. The `fetch({ offset, limit, sort, filters, signal })`
function returns `{ rows, total }`, or `{ rows, hasMore }` when the total is unknown.

The table requests rows in blocks of `blockSize` as the user scrolls and keeps the last fifty
blocks. While a block is loading, placeholders stand in for its rows.

Sorting, filters and search run on the server, and outdated requests are canceled through
`signal`. The `totals` function returns the totals row.

The `values` function feeds a list filter: it receives the column key, the filters, a `limit` and
the `search` text and returns `{ values, truncated }`. With
`truncated: true` the filter says that not every value is listed and offers search.

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

To load a tree from the server, set `source.children`: it gets a row, the sorting, filters and a
`signal` and returns the row's children. Mark rows with children with
`hasChildren`, and the children load when the row is expanded. Grouping does not work in a tree.

While the children are loading, a placeholder shows under the row. CSV export of a tree takes
only the top-level rows.

<Example name="table/SourceTree" />
