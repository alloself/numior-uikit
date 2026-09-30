# useReorder

`useReorder(options)` drags list items with a pointer and the keyboard. It brings a drag
threshold, auto-scroll at the container edges, the `grabbed`, `moved`, `dropped` and
`cancelled` events and RTL mirroring. Your `onMove(from, to)` performs the move.

## Signature

<SignatureReference :names="['useReorder', 'ReorderOptions', 'Reorder', 'ReorderState', 'ReorderEvent']" />

## Usage

```ts
import { useReorder } from '@numior/vue';

const reorder = useReorder({
  axis: 'y',
  count: () => rows.value.length,
  container: list,
  indexAt: (client, from) => indexUnderPointer(client, from),
  onMove: (from, to) => rows.value.splice(to, 0, ...rows.value.splice(from, 1)),
});
```

`onPointerdown(index, event)` attaches to the row handle, `onKeydown(index, event)` to the
same handle for arrows with a modifier. `state` describes the phase: `idle`, `pending`,
`dragging`, `keyboard`. `NuiFieldArray` reorders form fields this way.

## Edge auto-scroll

`useEdgeScroll(options)` is the same auto-scroll on its own. `follow({ x, y })` scrolls the
container while the point stays near its edge and calls `onStep` after every step, and `stop()`
ends it. [Table](/en/components/table) drags cell ranges past the edge with it.

<SignatureReference :names="['useEdgeScroll', 'EdgeScrollOptions', 'EdgeScroll', 'EdgePoint']" />
