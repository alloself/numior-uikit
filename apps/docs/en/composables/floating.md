# useFloating

`useFloating(reference, floating, options)` places a floating element next to a reference
element, for example a list of options under an input. The position updates on scroll and
resize.

`placement` sets the side and alignment, for example `bottom-start`, and `offset` the distance in
pixels. When there is not enough room, the element moves to the opposite side. `arrow` is the
arrow element, which the composable points at the reference element.

## Signature

<SignatureReference :names="['useFloating', 'FloatingOptions']" />

## Usage

```ts
import { useFloating } from '@numior/vue';

useFloating(trigger, panel, {
  placement: 'bottom-start',
  offset: 8,
  size: { matchWidth: true, fitHeight: true },
  enabled: () => open.value,
});
```

`size.matchWidth` makes the element at least as wide as the reference, and `size.fitHeight`
limits its height to the free space in the window. `enabled` turns the positioning on while the
element is open.

By default the element uses `position: fixed`, so a parent with `overflow: hidden` does not clip
it. `strategy: 'absolute'` uses `position: absolute` instead.
