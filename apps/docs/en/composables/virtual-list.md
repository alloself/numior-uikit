# useVirtualList

`useVirtualList(container, options)` renders only the visible rows of a long list. From
`count` and `itemSize` it computes the range, the spacers before and after it and the total
size. The container stays yours, so the rows can live in a `<tbody>` or any list.

<Example name="composables/VirtualList" />

## Signature

<SignatureReference :names="['useVirtualList', 'VirtualListOptions', 'VirtualList', 'VirtualItem']" />

## Behaviour

`items` are the visible entries with index, start and size, `startSize` and `endSize` the
spacer paddings, `totalSize` the full height. The server renders the first `initialCount`
rows, `pinned` keeps an index in view when the data changes, `scrollTo(index)` scrolls to a
row. `overscan` adds rows beyond the window edges.
