# useIcon

`useIcon(icon)` returns an icon component by its name, for example `'x'` or `'check'`. `NuiIcon`
is built on it.

When the `icons` option has an icon with that name, you get it, otherwise the built-in Lucide
icon. A built-in icon loads the first time it is shown. A component passed instead of a name
comes back as it is.

`lazyIcon(loader)` turns a dynamic import into an icon component that loads once, the first time
it is shown.

## Signature

<SignatureReference :names="['useIcon', 'useIcons', 'lazyIcon', 'IconSource', 'IconRegistry']" />

## Usage

Use `useIcon` when a third-party component, not `NuiIcon`, expects an icon. It gets the same
icon the app uses for that name:

```vue
<template>
  <ExternalTabs :items="tabs" :close-icon="close" />
</template>

<script setup lang="ts">
import { useIcon } from '@numior/vue';

const close = useIcon('x');
</script>
```

`useIcons()` returns only the icons set in the nearest settings. Replacing the built-in icons is
described on the [Icon](/en/components/icon) page.
