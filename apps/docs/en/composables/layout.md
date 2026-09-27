# useLayout

`useLayout()` returns the context of the nearest `NuiLayout`: the sidebar state `open` and
`mobileOpen`, the narrow-screen flag `mobile`, `sidebarId` for `aria-controls` and
`toggle()`. Own buttons in the header control the sidebar this way.

## Signature

<SignatureReference :names="['useLayout', 'LayoutContext']" />

## Usage

```vue
<template>
  <NuiButton
    variant="ghost"
    tone="neutral"
    :aria-expanded="layout.open.value"
    :aria-controls="layout.sidebarId.value"
    @click="layout.toggle()"
  >
    Menu
  </NuiButton>
</template>

<script setup lang="ts">
import { NuiButton, useLayout } from '@numior/vue';

const layout = useLayout();
</script>
```

Outside `NuiLayout` the call throws. The component is described on the
[Layout](/en/components/layout) page.
