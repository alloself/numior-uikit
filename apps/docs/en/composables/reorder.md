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
drops it. `onBlur(index)` on the handle's `blur` event cancels the move when focus leaves it.

`state.phase` shows the stage: `idle`, `pending`, `dragging` or `keyboard`. `onEvent` receives
the `grabbed`, `moved`, `dropped` and `cancelled` events, which are handy for announcing the move
to a screen reader. `NuiFieldArray` reorders field groups this way.

## Edge auto-scroll

`useEdgeScroll(options)` is the same edge scrolling without the drag. `follow({ x, y })` scrolls
the container while the point is within 24 pixels of its edge and calls `onStep` after every
step. `stop()` stops the scrolling.

`follow` only records the point, and one step is made per frame. So the speed does not depend on
how often the pointer moves.

This is how [Table](/en/table/editing) scrolls when a cell selection is dragged past the
edge.

<SignatureReference :names="['useEdgeScroll', 'EdgeScrollOptions', 'EdgeScroll', 'EdgePoint']" />

## Presses and drags

`usePointerSession()` runs a drag from press to release. `begin({ move, up, cancel })` attaches
the handlers and `end()` detaches them. With `{ capture: true }` they get events in the capture
phase.

The listeners sit on the window, one set for the whole page. A drag never adds or removes its
own: WebKit restyles the whole document on each such change.

`createPressTargets()` hands presses to the parts of a container through one `pointerdown`
listener. Put `onPointerdown` on the container and register the parts with
`usePressTarget(targets, element, press)` or the ref function `pressRefOf(targets, press)`.

A press travels from the element under the pointer up to the container, and `stopPropagation()`
stops it. The column and row grips of [Table](/en/table/columns) work this way.

```ts
import { createPressTargets, usePointerSession, usePressTarget } from '@numior/primitives';

const targets = createPressTargets();
const session = usePointerSession();

usePressTarget(targets, grip, () => {
  session.begin({
    move: (event) => follow(event.clientX),
    up: session.end,
    cancel: session.end,
  });
});
```

<SignatureReference :names="['usePointerSession', 'PointerSessionOptions', 'PointerSession', 'PointerSessionHandlers', 'createPressTargets', 'usePressTarget', 'pressRefOf', 'PressTargets']" />
