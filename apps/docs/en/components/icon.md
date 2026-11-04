# Icon

`NuiIcon` renders an icon by name, such as `check` or `search`, or your own icon component. By
default the names map to [Lucide](https://lucide.dev) icons from the `@lucide/vue` package.

<Example name="icon/Basic" />

Each icon loads separately the first time it is needed, so the bundle does not include the whole
set. Icons inside Numior UI components, such as the select arrow or the dialog close button, render the
same way.

## Installation

```ts
import { NuiIcon } from '@numior/vue';
import '@numior/vue/styles/icon.css';
```

## Usage

<Configurator name="NuiIcon" />

## Examples

### Custom component

`icon` also takes any component, for example an SVG icon in its own `.vue` file. It renders as
is, with the same size and color.

<Example name="icon/Custom" />

App icons need no registration: import the one you need and pass it directly, for example
`<NuiIcon :icon="Save" />` with `import { Save } from '@lucide/vue'`.

### Custom icons in components

The icons that Numior UI components use (`check`, `x`, `chevron-down`, `loader` and others) can be
replaced with your own. For the whole app, pass them to `icons` of the `createNuiConfig` plugin:

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

Only the listed icons change, the rest stay Lucide. `lazyIcon` loads an icon only when it is
first needed. To replace icons in one part of the page, call `provideNuiConfig` in the `setup` of
its component.

The keys of `icons` are type-checked, so a typo in a name shows up in the editor right away.

## Accessibility

Screen readers skip the icon. Give a button that holds only an icon an `aria-label`. The icon is
1.25 times the font size and takes the color of the text around it.

## API

<ApiReference name="NuiIcon" />
