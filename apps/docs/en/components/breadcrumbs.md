# Breadcrumbs

`NuiBreadcrumbs` is a `<nav>` with an ordered list of `NuiLink` crumbs whose last item is
marked `aria-current="page"`. The separator is a registry icon (`chevron-right` by default,
mirrored in RTL). `maxItems` collapses the middle of a long trail into an ellipsis button
that opens a `NuiMenu` with the hidden links.

<script setup>
const path = [
  { label: 'Home', href: '#' },
  { label: 'Projects', href: '#projects' },
  { label: 'Numior', href: '#numior' },
  { label: 'Settings', href: '#settings' },
  { label: 'Billing' },
]
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiBreadcrumbs :items="path.slice(0, 3)" label="Path" />
  <NuiBreadcrumbs :items="path" :max-items="3" label="Full path" />
</div>

```vue
<script setup lang="ts">
import { NuiBreadcrumbs, type NuiBreadcrumbItem } from '@numior/vue';

const path: NuiBreadcrumbItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Projects', href: '/projects' },
  { label: 'Numior', href: '/projects/numior' },
  { label: 'Settings', href: '/projects/numior/settings' },
  { label: 'Billing' },
];
</script>

<template>
  <NuiBreadcrumbs :items="path" :max-items="3" label="Path" />
</template>
```

## Custom crumb

The `item` slot receives `{ item, index, current }` and replaces the standard link or current
element; separators and collapsing stay with the component. For a router pass `as` and `to`
in the items, and they reach the links inside the ellipsis menu too.

```vue
<NuiBreadcrumbs :items="path" :as="RouterLink" v-slot:item="{ item, current }">
  <strong v-if="current">{{ item.label }}</strong>
  <NuiLink v-else :as="RouterLink" :to="item.to" tone="neutral">{{ item.label }}</NuiLink>
</NuiBreadcrumbs>
```

## Accessibility

The `<nav aria-label>` landmark and the `<ol>` list give screen readers the structure of the
trail; the current page is not a link. Crumb links are at least 24px tall to satisfy WCAG
2.5.8 as standalone targets. The ellipsis is a regular menu button with `aria-haspopup="menu"`
and an accessible name from `moreLabel`.

## API

| Prop        | Type                             | Default                                                  | Description                            |
| ----------- | -------------------------------- | -------------------------------------------------------- | -------------------------------------- |
| `items`     | `{ label, href?, to?, icon? }[]` | —                                                        | The trail; the last item is the page   |
| `maxItems`  | `number`                         | —                                                        | Beyond it the middle collapses         |
| `separator` | `IconAlias`                      | `'chevron-right'`                                        | Separator icon                         |
| `label`     | `string`                         | [dictionary](/en/localization#breadcrumbs): “Breadcrumb” | `aria-label` of the nav                |
| `moreLabel` | `string`                         | [dictionary](/en/localization#breadcrumbs): “Show path”  | Accessible name of the ellipsis button |
| `as`        | `string \| Component`            | `'a'`                                                    | Link component for a router            |

Slot `item="{ item, index, current }"`. Block `nui-breadcrumbs`, elements `__list`, `__item`,
`__link`, `__current`, `__icon`, `__separator`, `__more`.
