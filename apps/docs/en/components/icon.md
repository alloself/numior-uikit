# Icon

The kit components request icons by alias through a registry, and `NuiIcon` draws what `icon`
holds: an alias from the registry or a ready component. By default the aliases point to
[Lucide](https://lucide.dev) from the `@lucide/vue` package. Every kit icon is a separate small
module that `NuiIcon` loads on the first use of its alias and keeps.

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

`icon` also takes any component, such as an own SVG icon in an SFC: it renders as is,
without the registry.

<Example name="icon/Custom" />

### Own icons instead of kit icons

The kit aliases (`check`, `x`, `chevron-down`, `loader` and others) can be overridden. The app
uses `createNuiConfig`, a subtree uses `provideNuiConfig` in the `setup` of an own component. Nested calls layer and change only the given aliases; the rest stay Lucide icons.

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
      },
    }),
  )
  .mount('#app');
```

The registry keys are kit aliases only, so a typo becomes a type error. App icons need no
alias: the component goes into `icon` directly, for example `<NuiIcon :icon="Save" />` with
`import { Save } from '@lucide/vue'`.

## Accessibility

The icon is decorative: `aria-hidden="true"`, size `1.25em`, colour inherited from
`currentColor`. The parent gives the meaningful name, for example `aria-label` on a button.

## API

<ApiReference name="NuiIcon" />
