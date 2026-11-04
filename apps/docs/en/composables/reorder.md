# useReorder

`useReorder(options)` lets the user reorder list items with a mouse, a finger or the keyboard.
Your `onMove(from, to)` handler changes the list itself.

Dragging starts once the pointer moves `threshold` pixels, 5 by default. Near the container edge
the list scrolls on its own, and Escape cancels the drag.

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

Put `onPointerdown(index, event)` and `onKeydown(index, event)` on the item handle. With the
keyboard, Enter or Space picks the item up, the arrow keys move it, and Enter or Space again
drops it.

`state.phase` shows the stage: `idle`, `pending`, `dragging` or `keyboard`. `onEvent` receives
the `grabbed`, `moved`, `dropped` and `cancelled` events, which are handy for announcing the move
to a screen reader. `NuiFieldArray` reorders field groups this way.

## Edge auto-scroll

`useEdgeScroll(options)` is the same edge scrolling without the drag. `follow({ x, y })` scrolls
the container while the point is within 24 pixels of its edge and calls `onStep` after every
step. `stop()` stops the scrolling.

This is how [Table](/en/components/table) scrolls when a cell selection is dragged past the
edge.

<SignatureReference :names="['useEdgeScroll', 'EdgeScrollOptions', 'EdgeScroll', 'EdgePoint']" />
