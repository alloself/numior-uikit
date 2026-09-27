# usePopover

`usePopover(content, options)` drives the native Popover API. `contentAttrs` go on the
content, `invokerAttrs` on the button, and `open` stays in sync with the `toggle` events.
`useDelayedOpen` adds open and close delays for tooltips.

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

The `auto` mode closes the popover on an outside click and Escape, `manual` leaves closing to
the code. `raise()` lifts an open popover above its siblings. [Popover](/en/components/popover)
and [Tooltip](/en/components/tooltip) are built on these composables.
