# useIcons

`useIcons()` returns the icon registry of the nearest configuration: an "alias → component"
object where the app icons lie over the package sets. `lazyIcon(loader)` wraps a dynamic import
into a component that loads once on the first render. `NuiIcon` is built on these.

## Signature

<SignatureReference :names="['useIcons', 'lazyIcon', 'IconRegistry', 'NuiIconAliases']" />

## Usage

```ts
import { h } from 'vue';
import { lazyIcon, useIcons } from '@numior/vue';

const icons = useIcons();
const save = lazyIcon(() => import('./icons/SaveIcon.vue'));
const render = () => (icons.check === undefined ? null : h(icons.check));
```

An alias missing from the registry gives `undefined`. The registry, own sets and declaring own
aliases are described on the [Icon](/en/components/icon) page.
