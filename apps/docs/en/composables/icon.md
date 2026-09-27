# useIcon

`useIcon(alias)` returns the icon component from the registry of the nearest configuration,
`useIcons()` the whole registry. `lazyIcon(loader)` wraps a dynamic import into a component
that loads once on the first render. `NuiIcon` is built on these.

## Signature

<SignatureReference :names="['useIcon', 'useIcons', 'lazyIcon', 'IconRegistry']" />

## Usage

```ts
import { h } from 'vue';
import { lazyIcon, useIcon } from '@numior/vue';

const check = useIcon('check');
const save = lazyIcon(() => import('./icons/SaveIcon.vue'));
const render = () => (check.value ? h(check.value) : null);
```

An unknown alias gives `undefined`. The registry and own sets are described on the
[Icon](/en/components/icon) page.
