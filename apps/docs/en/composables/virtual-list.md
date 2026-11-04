# useVirtualList

`useVirtualList(container, options)` renders only the visible rows of a long list, for example
a table with 100,000 rows. From the row count `count` and the row height `itemSize` it works out
which rows are visible and how much space they need around them.

You write the markup yourself, so the rows can go into a `<tbody>` or any list.

<Example name="composables/VirtualList" />

## Signature

<SignatureReference
  :names="[
    'useVirtualList',
    'VirtualListOptions',
    'VirtualList',
    'VirtualItem',
    'useVirtualFrame',
    'VirtualFrame',
    'VirtualFrameStyles',
    'createSizeIndex',
    'SizeIndex',
    'VirtualSize',
  ]"
/>

## Behaviour

`items` are the visible rows with their index, start and height. `startSize` and `endSize` are
the heights of the empty spacing before and after them, `totalSize` the height of the whole list.

On the server the first `initialCount` rows render, 20 by default. `overscan` adds rows beyond
the edges of the visible area, 4 by default. `pinned` keeps a row in place when the data changes,
and `scrollTo(index)` scrolls to a row.

Every visible row has a `slot`, a small number that stays with the row while it is rendered. When
the row leaves the visible area, its slot passes to a new one. Use `slot` as the `key`, and Vue
updates the same elements instead of creating new ones on every scroll.

## Fast scrolling

The browser scrolls the page on a separate thread, and new rows appear a frame later. When the
user drags the scrollbar fast, an empty space can flash where the rows should be.

To avoid it, use a sticky block of rows from `frame`. `lead` and `rest` are the heights of the
spacers before and after the block, `clampStart` and `clampEnd` the limits the block never
crosses.

Give the block of rows `position: sticky` and pass the limits to `inset-block-start` and
`inset-block-end`. Put the spacers next to the block inside the scroll container, as in the
example above. The browser then holds the block at the edge until the new rows arrive.

Numior UI components get these values through `useVirtualFrame(container, frame)`. It returns
styles for the container and the block of rows. It writes growing spacers to the DOM at once, so
the list height does not drop before the render.

`windowOffset` is the offset of the first rendered row from the visible area, for blocks your own
code moves.

When all rows have the same height, both edges of the block move at the same scroll pixel. So
crossing a row boundary updates the block once.

## Frozen rows

`frozen: n` always renders the first `n` rows, for example the frozen rows of a table. The other
rows are counted below them, and `scrollTo` brings a row to the lower edge of the frozen ones.

Make the frozen rows sticky with the `offsetOf(index)` offset. The `frame` limits already include
their height.

## Several lists in one container

`listen: false` turns off the built-in scroll listener. When several lists share a scroll
container, call `measure()` on each from one listener. The rows then update once per event.

## Horizontal and very long lists

`axis: 'x'` counts the visible columns horizontally, from `scrollLeft` and the width. In RTL the
scroll starts at the right edge.

`maxSize` keeps the list height below the browser limit. Then `canvasSize` is the height in the
DOM and `scrollTop` the position in the full list. `items[].offset` is the position of a row in
the DOM.

## Rows of different heights

When rows have different heights, create a height index with
`createSizeIndex(count, estimate, known)`. `estimate` is the approximate row height, `known` the
heights you already have. Pass the index to `itemSize`.

After measuring rows, call `resize([[index, size]])`. The list updates the index and shifts the
scroll so that the first visible row stays in place. At the end of the list the scroll stays at
the end, even when the rows there turn out taller.

When you replace the index with a new one, the row with the same number stays on top.
`offsetOf(index)` returns the offset of a row from the start of the list, `indexAt(offset)` the
row at that offset.
