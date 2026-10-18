# useIcons

`useIcons()` returns the icon registry of the nearest configuration: an "alias → component"
object where the app icons lie over the package sets. `lazyIcon(loader)` wraps a dynamic import
into a component that loads once on the first render. `NuiIcon` is built on these.

## Signature

<SignatureReference :names="['useIcons', 'lazyIcon', 'IconRegistry', 'NuiIconSets']" />

## Usage

The registry helps where a component other than `NuiIcon` expects an icon: it gets the same
glyph the app chose for the alias.

```vue
<template>
  <ExternalTabs :items="tabs" :close-icon="icons.x" />
</template>

<script setup lang="ts">
import { useIcons } from '@numior/vue';

const icons = useIcons();
</script>
```

An alias missing from the registry gives `undefined`. The registry, own sets and declaring own
aliases are described on the [Icon](/en/components/icon) page.
