# Icons and configuration

The kit is not tied to one icon set. Every icon a component needs is requested by
alias through a registry: `check`, `minus`, `loader`, `chevron-down`, `x`, `search`,
`info`, `success`, `warning`, `error`.
By default the aliases point to [Lucide](https://lucide.dev) (ISC): each icon loads on
demand as a separate module the first time its alias is used and is reused from the
cache afterwards; only requested glyphs reach the bundle, and the server renders the
icon immediately.

<div class="nui-demo" data-nui-theme="light">
  <NuiIcon alias="check" />
  <NuiIcon alias="minus" />
  <NuiIcon alias="loader" />
  <NuiIcon alias="chevron-down" />
  <NuiIcon alias="x" />
  <NuiIcon alias="search" />
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

The registry is a plain object mapping alias to component. Provide it for a subtree
with `NuiConfigProvider` or for the whole app with the `createNuiConfig` plugin.
Nested providers layer: the closest one overrides only the aliases it defines.

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
<NuiConfigProvider :icons="{ check: CheckIcon }">
  <!-- checkboxes and buttons in here use CheckIcon -->
</NuiConfigProvider>
```

Custom aliases work too: `provideNuiConfig({ icons: { 'my-app:save': SaveIcon } })`
and then `<NuiIcon alias="my-app:save" />`. An unknown alias renders nothing. Load heavy
sets lazily: `lazyIcon(() => import('./icons/SaveIcon.vue'))` returns a component that
loads once on first render.

## API

| Component           | Prop    | Type                        | Description                                |
| ------------------- | ------- | --------------------------- | ------------------------------------------ |
| `NuiIcon`           | `alias` | `IconAlias` (`string`)      | Alias from the registry or the default set |
| `NuiIcon`           | `icon`  | `Component`                 | Explicit component, wins over `alias`      |
| `NuiConfigProvider` | `icons` | `Record<string, Component>` | Aliases for the subtree                    |

`@numior/vue` also exports `createNuiConfig`, `provideNuiConfig`, `useIcons` and
`defaultIcons`.
