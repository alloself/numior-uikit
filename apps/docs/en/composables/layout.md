# useLayout

`useLayout()` gives access to the sidebar of the nearest `NuiLayout`. Use it so your own button
in the header opens and closes the sidebar.

`open` tells whether the sidebar is open on a wide screen, `mobileOpen` on a narrow one, and
`mobile` whether the screen is narrow now. `toggle()` opens or closes the sidebar for the current
screen width. Pass `sidebarId` to the button's `aria-controls`.

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

Outside `NuiLayout` the call throws an error. The component is described on the
[Layout](/en/components/layout) page.
