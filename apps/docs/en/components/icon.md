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

createApp(App)
  .use(
    createNuiConfig({
      icons: {
        check: CheckIcon,
        loader: lazyIcon(() => import('./icons/SpinnerIcon.vue')),
        'app:save': lazyIcon(() => import('./icons/SaveIcon.vue')),
      },
    }),
  )
  .mount('#app');
```

Aliases are typed: `icon` takes only the keys of the `NuiIconAliases` interface, so a typo is a
type error. An app declares its own alias by extending the interface, and kit packages such as
the editor add theirs the same way:

```ts
declare module '@numior/primitives' {
  interface NuiIconAliases {
    readonly 'app:save': true;
  }
}
```

After that `<NuiIcon icon="app:save" />` type-checks. An alias that is declared but not
registered draws nothing. `lazyIcon` loads the module once on the first render.

## Accessibility

The icon is decorative: `aria-hidden="true"`, size `1.25em`, colour inherited from
`currentColor`. The parent gives the meaningful name, for example `aria-label` on a button.

## API

<ApiReference name="NuiIcon" />
