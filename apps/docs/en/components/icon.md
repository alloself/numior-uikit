# Icon

The kit components request icons by alias through a registry, and `NuiIcon` draws what `icon`
holds: an alias from the registry or a ready component. By default the aliases point to
[Lucide](https://lucide.dev). Every icon loads as a separate module on first use, and only
the requested glyphs reach the bundle.

<Example name="icon/Basic" />

## Installation

```ts
import { NuiIcon } from '@numior/vue';
import '@numior/vue/styles/icon.css';
```

## Usage

<Configurator name="NuiIcon" />

## Examples

### Own component

`icon` also takes any component, including a functional one built with `h`: it renders as is,
without the registry.

<Example name="icon/Custom" />

### Own set

The registry is an "alias → component" object. `createNuiConfig` passes it for the app,
`provideNuiConfig` in the `setup` of an own component for a subtree. Nested calls layer and
override only the given aliases.

```ts
import { createApp } from 'vue';
import { createNuiConfig, lazyIcon } from '@numior/vue';
import CheckIcon from './icons/CheckIcon.vue';

const appIcons = {
  check: CheckIcon,
  loader: lazyIcon(() => import('./icons/SpinnerIcon.vue')),
  'app:save': lazyIcon(() => import('./icons/SaveIcon.vue')),
};

declare module '@numior/primitives' {
  interface NuiIconSets {
    app: typeof appIcons;
  }
}

createApp(App)
  .use(createNuiConfig({ icons: appIcons }))
  .mount('#app');
```

An alias is a key of one of the sets in `NuiIconSets`. The kit declares its set there, the
editor declares its own, and an app adds one line with its registry as above.

So `icon` takes only existing keys and a typo becomes a type error: `<NuiIcon icon="app:save" />`
type-checks, `<NuiIcon icon="app:sav" />` does not. `lazyIcon` loads the module once on the first
render.

## Accessibility

The icon is decorative: `aria-hidden="true"`, size `1.25em`, colour inherited from
`currentColor`. The parent gives the meaningful name, for example `aria-label` on a button.

## API

<ApiReference name="NuiIcon" />
