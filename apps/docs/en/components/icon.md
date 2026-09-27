# Icon

The kit components request icons by alias through a registry, and `NuiIcon` draws an icon by
alias or takes a ready component. By default the aliases point to
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

`icon` takes any component, including a functional one built with `h`; it takes priority
over `alias`.

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

Own aliases such as `app:save` are available as `<NuiIcon alias="app:save" />`; an unknown
alias draws nothing. `lazyIcon` loads the module once on the first render.

## Accessibility

The icon is decorative: `aria-hidden="true"`, size `1.25em`, colour inherited from
`currentColor`. The parent gives the meaningful name, for example `aria-label` on a button.

## API

<ApiReference name="NuiIcon" />
