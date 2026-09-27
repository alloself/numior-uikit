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
`dragging`, `keyboard`. [Table](/en/components/table) reorders rows and columns this way.
