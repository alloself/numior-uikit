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
    'useVirtualFrame',
    'VirtualFrame',
    'VirtualFrameStyles',
    'createSizeIndex',
    'SizeIndex',
    'VirtualSize',
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

`frame` describes a sticky window. `lead` and `rest` are the spacer heights before and after
the block of rows, `clampStart` and `clampEnd` the limits the block never crosses.

Give the block of rows `position: sticky` and pass the limits to `inset-block-start` and
`inset-block-end`. Put the spacers next to the block inside the scroller, as in the example
above. The browser scrolls the block on its own and holds it at the edge until the next frame.

The kit components take these values through `useVirtualFrame(container, frame)`. It returns
styles for the scroller and the block of rows. A growing spacer goes to the DOM before the
render, so the canvas never dips.

`windowOffset` is the offset of the first rendered row from the viewport, for windows your own
code moves.

With rows of one height both window edges move at the same scroll offset. Crossing a row
boundary therefore updates the window once.

`listen: false` leaves the scroll event to you. Call `measure()` from one shared listener
when several windows share a scroller, so the rows update once per event.

`axis: 'x'` windows horizontally from `scrollLeft` and the width; in RTL the scroll starts at
the right edge. `maxSize` keeps the canvas below the browser ceiling. Then `canvasSize` is the
physical height, `scrollTop` the logical one, and `items[].offset` places a row in the canvas.

`createSizeIndex(count, estimate, known)` keeps measured sizes in a Fenwick tree, and `known` seeds
the sizes you already have. Pass it as `itemSize` and call `resize([[index, size]])` of the list
after measuring rows. It updates the index and shifts the scroll so that the first visible row
stays in place.

At the end of the list `resize` keeps the scroll at the end when the rows there turn out taller.
Replacing the index with a new one leaves the row with the same number on top. `offsetOf(index)`
gives the offset of a row, and `indexAt(offset)` the row under an offset.
