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
