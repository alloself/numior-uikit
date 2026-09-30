# useVirtualList

`useVirtualList(container, options)` renders only the visible rows of a long list. From
`count` and `itemSize` it computes the range, the spacers before and after it and the total
size. The container stays yours, so the rows can live in a `<tbody>` or any list.

<Example name="composables/VirtualList" />

## Signature

<SignatureReference
  :names="[
    'useVirtualList',
    'VirtualListOptions',
    'VirtualList',
    'VirtualItem',
    'createSizeIndex',
    'SizeIndex',
  ]"
/>

## Behaviour

`items` are the visible entries with index, start and size, `startSize` and `endSize` the
spacer paddings, `totalSize` the full height. The server renders the first `initialCount`
rows, `pinned` keeps an index in view when the data changes, `scrollTo(index)` scrolls to a
row. `overscan` adds rows beyond the window edges.

Every item carries a `slot`, a small number that stays with the row while it is rendered.
When the row leaves the window, the slot passes to a newcomer. Key rendered rows by `slot`,
and the browser patches the same elements instead of mounting new ones on every scroll step.

The browser scrolls on the compositor thread and paints your rows on the main thread one
frame later. When an update misses the frame, rows placed on a tall canvas leave the
viewport during a fast scrollbar drag.

Keep the rows in a window with `position: sticky` that covers the viewport. Move a block of
consecutive rows with `translate: 0 <windowOffset>px`, where `windowOffset` is the offset of
the first rendered row relative to the viewport. Rows that keep their canvas positions move
with `translate: 0 -<scrollTop>px` instead.

The compositor holds the sticky window in place until the next frame replaces its rows.

`listen: false` leaves the scroll event to you. Call `measure()` from one shared listener
when several windows share a scroller, so the rows update once per event.

`axis: 'x'` windows horizontally from `scrollLeft` and the width; in RTL the scroll starts at
the right edge. `maxSize` keeps the canvas below the browser ceiling. Then `canvasSize` is the
physical height, `scrollTop` the logical one, and `items[].offset` places a row in the canvas.

`createSizeIndex(count, estimate)` keeps measured sizes in a Fenwick tree. Pass it as
`itemSize` and call `set(index, size)` after measuring a row.
