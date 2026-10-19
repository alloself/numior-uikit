# useIcon

`useIcon(icon)` turns an icon source into a component, and `NuiIcon` is built on it. An alias
gives the icon from the configuration or else the kit's Lucide icon, loaded on first use. A
component stays as it is.

`lazyIcon(loader)` wraps a dynamic import into a component that loads once on the first render.

## Signature

<SignatureReference :names="['useIcon', 'useIcons', 'lazyIcon', 'IconSource', 'IconRegistry']" />

## Usage

`useIcon` helps where a component other than `NuiIcon` expects an icon: it gets the same
glyph the app chose for the alias.

```vue
<template>
  <ExternalTabs :items="tabs" :close-icon="close" />
</template>

<script setup lang="ts">
import { useIcon } from '@numior/vue';

const close = useIcon('x');
</script>
```

`useIcons()` returns only the overrides of the nearest configuration. Overriding kit icons is
described on the [Icon](/en/components/icon) page.
