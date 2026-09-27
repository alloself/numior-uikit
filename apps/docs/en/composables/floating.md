# useFloating

`useFloating(reference, floating, options)` places a floating element next to an anchor. It
takes the side and alignment from `placement`, the `offset`, an arrow, flipping when space
runs out and width matching. The result is written straight into the element styles, without reactive
state.

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

`strategy: 'fixed'` is needed inside `overflow: hidden`; native popovers and dialogs in the
top layer are positioned the same way. CSS reads the open side from private variables, which
the kit components turn into the animation and the arrow position.
