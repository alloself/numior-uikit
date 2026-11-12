# usePopover

`usePopover(content, options)` opens and closes a panel through the Popover API from the `open`
model. Use it for your own floating panel when [Popover](/en/components/popover) does not fit.

Put `contentAttrs` on the panel and `invokerAttrs` on the button that opens it. `useDelayedOpen`
adds a delay before opening and closing, as on a tooltip.

## Signature

<SignatureReference :names="['usePopover', 'PopoverOptions', 'PopoverControl', 'useDelayedOpen', 'DelayedOpenOptions', 'DelayedOpen']" />

## Usage

```vue
<template>
  <button v-bind="popover.invokerAttrs.value" @click="popover.toggle()">Filters</button>
  <div ref="panel" v-bind="popover.contentAttrs.value">…</div>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { usePopover } from '@numior/vue';

const open = ref(false);
const panel = useTemplateRef<HTMLElement>('panel');
const popover = usePopover(panel, { open, mode: 'auto' });
</script>
```

In the `auto` mode the panel closes on an outside click and on Escape. In the `manual` mode it
closes only when you change `open`. `raise()` brings an open panel above the others.

[Popover](/en/components/popover) and [Tooltip](/en/components/tooltip) are built on these
composables.

## After a release and under a resting mouse

The browser closes a panel shown on `contextmenu` or a long press on the `pointerup` of the same
press. `useAfterRelease()` returns a function of the event and an action. The action runs once the
button is released, or at once when it already is.

An action still waiting is dropped when its component unmounts.

`useRestingHover(target)` keeps `hovered` while the mouse stays still, even when the element under
it is gone. This way a stack of toasts stays open when the toast under the pointer closes. The
hover ends on the first move away from `target`, a press outside it or a call to `end()`.

<SignatureReference :names="['useAfterRelease', 'AfterRelease', 'useRestingHover', 'RestingHover']" />
