# Icon

An icon by its name or from your own component.

<Example name="icon/Basic" />

Each icon loads separately, the first time it is needed.

## Installation

```ts install
import { NuiIcon } from '@numior/kit';
```

## Usage

Type an icon name from the [table below](#icon-names).

<Configurator name="NuiIcon" />

## Examples

### Render your own icon

Pass the component to `icon`.

<Example name="icon/Custom" />

An icon from `@lucide/vue` works the same way: import it and pass it directly.

### Replace icons in components

Pass your icons to `icons` of the `createNuiConfig` plugin:

```ts
import { createApp } from 'vue';
import { createNuiConfig, lazyIcon } from '@numior/kit';
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

Only the icons you list change; the rest stay as they are. `lazyIcon` turns on lazy loading: the
file arrives when the icon first appears on screen.

### Icon names

Search by a name or by the Lucide icon behind it.

<IconReference />

## Accessibility

Screen readers skip the icon, so name a button that holds only an icon with `aria-label`.

## API

<ApiReference name="NuiIcon" />
