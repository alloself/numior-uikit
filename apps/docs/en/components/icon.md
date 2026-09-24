# Icons and configuration

The kit is not tied to one icon set. Every icon a component needs is requested by
alias through a registry: `check`, `minus`, `loader`, `chevron-down`, `x`, `search`,
`info`, `success`, `warning`, `error`, `chevron-right`, `chevron-left`, `chevrons-left`,
`chevrons-right`, `ellipsis`, `external-link`, `user`, `image`, `inbox`, `folder`, `folder-open`,
`file`, `arrow-up`, `arrow-up-down`, `grip`, `plus`, `clock`.
By default the aliases point to [Lucide](https://lucide.dev) (ISC): each icon loads on
demand as a separate module the first time its alias is used and is reused from the
cache afterwards; only requested glyphs reach the bundle, and the server renders the
icon immediately.

<div class="vp-raw nui-demo" data-nui-theme="light">
  <NuiIcon alias="check" />
  <NuiIcon alias="minus" />
  <NuiIcon alias="loader" />
  <NuiIcon alias="chevron-down" />
  <NuiIcon alias="x" />
  <NuiIcon alias="search" />
  <NuiIcon alias="chevron-right" />
  <NuiIcon alias="ellipsis" />
  <NuiIcon alias="external-link" />
  <NuiIcon alias="user" />
  <NuiIcon alias="inbox" />
  <NuiIcon alias="folder" />
  <NuiIcon alias="arrow-up-down" />
</div>

## NuiIcon

`NuiIcon` renders an icon by alias or accepts a ready component through `icon`. The
markup is decorative: `aria-hidden="true"`, a `1.25em` box via the `nui-icon` class,
color inherited from `currentColor`. The parent provides the meaning, for example an
`aria-label` on a button.

```vue
<script setup lang="ts">
import { NuiButton, NuiIcon } from '@numior/vue';
import { Trash2 } from 'lucide-vue-next';
</script>

<template>
  <NuiButton variant="ghost" tone="error" aria-label="Delete">
    <NuiIcon :icon="Trash2" />
  </NuiButton>
  <NuiIcon alias="search" />
</template>
```

## Your own icon set

The registry is a plain object mapping alias to component. The `createNuiConfig` plugin
installs it for the whole app; for a subtree call `provideNuiConfig` in the `setup` of your
own wrapper component, since the kit ships no React-style provider components. Nested calls
layer: the closest one overrides only the aliases it defines.

```ts
import { createApp } from 'vue';
import { createNuiConfig } from '@numior/vue';
import CheckIcon from './icons/CheckIcon.vue';
import SpinnerIcon from './icons/SpinnerIcon.vue';

createApp(App)
  .use(createNuiConfig({ icons: { check: CheckIcon, loader: SpinnerIcon } }))
  .mount('#app');
```

```vue
<template><slot /></template>

<script setup lang="ts">
import { provideNuiConfig } from '@numior/vue';
import CheckIcon from './icons/CheckIcon.vue';

provideNuiConfig({ icons: { check: CheckIcon } });
</script>
```

Custom aliases work too: `provideNuiConfig({ icons: { 'my-app:save': SaveIcon } })`
and then `<NuiIcon alias="my-app:save" />`. An unknown alias renders nothing. Load heavy
sets lazily: `lazyIcon(() => import('./icons/SaveIcon.vue'))` returns a component that
loads once on first render.

## Locale

Numbers, time and dates format through the locale of the same configuration:
`createNuiConfig({ locale: 'ru-RU' })` for the app, `provideNuiConfig({ locale })` in a
component's `setup` for a subtree (a value, ref or getter), and the `locale` prop on a
component for a local override. Without any setup
`en-US` applies. The kit never reads `navigator.language`: server and client must format
identically, so pass the request locale into the config explicitly. The same place takes
`today`, a function returning today's `YYYY-MM-DD` for calendars and deterministic tests;
by default it is the device's local date.

```ts
createApp(App)
  .use(createNuiConfig({ locale: 'ru-RU', today: () => serverDate }))
  .mount('#app');
```

## API

| Where                                  | Option   | Type                        | Description                                |
| -------------------------------------- | -------- | --------------------------- | ------------------------------------------ |
| `NuiIcon`                              | `alias`  | `IconAlias` (`string`)      | Alias from the registry or the default set |
| `NuiIcon`                              | `icon`   | `Component`                 | Explicit component, wins over `alias`      |
| `createNuiConfig` / `provideNuiConfig` | `icons`  | `Record<string, Component>` | Aliases for the app or the subtree         |
| `createNuiConfig` / `provideNuiConfig` | `toasts` | `ToastStoreOptions`         | Toast service options                      |
| `createNuiConfig` / `provideNuiConfig` | `locale` | `string` (ref or getter)    | Locale for numbers, time and dates         |
| `createNuiConfig` / `provideNuiConfig` | `today`  | `() => string`              | Today's date as `YYYY-MM-DD`               |

`@numior/vue` also exports `useIcons`, `defaultIcons`, `useLocale` and `useToday`.
