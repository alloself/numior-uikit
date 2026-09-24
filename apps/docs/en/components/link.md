# Link

`NuiLink` is a link on the role tokens: an `<a>` by default, or `RouterLink` / `NuxtLink`
through `as` and `to`. `tone` picks the colour, `underline` decides when the underline shows,
`external` opens the address in a new tab with `rel="noopener noreferrer"` and an icon, and
`disabled` drops the address and marks the link `aria-disabled`.

<div class="vp-raw nui-demo" data-nui-theme="light">
  <NuiLink href="#">Plain link</NuiLink>
  <NuiLink href="#" underline="hover" tone="neutral">Underline on hover</NuiLink>
  <NuiLink href="https://lucide.dev" external>External</NuiLink>
  <NuiLink href="#" tone="error">Dangerous action</NuiLink>
  <NuiLink href="#" disabled>Unavailable</NuiLink>
</div>

```vue
<script setup lang="ts">
import { NuiLink } from '@numior/vue';
import '@numior/vue/styles/link.css';
</script>

<template>
  <p>See the <NuiLink href="/docs">documentation</NuiLink>.</p>
  <NuiLink href="https://lucide.dev" external>Lucide</NuiLink>
</template>
```

## Router

`as` takes a link component and `to` is passed through untouched. When `to` is set, `href`
is not rendered so the router owns the address. Menu items and breadcrumbs share the same
contract.

```vue
<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<template>
  <NuiLink :as="RouterLink" to="/settings">Settings</NuiLink>
</template>
```

## Accessibility

The link stays a native `<a>`: keyboard and screen readers work without JavaScript. A link
inside text may be any height (WCAG 2.5.8 exempts inline links), while standalone links in
navigation get a target of at least 24px, as breadcrumbs do. `disabled` keeps the link
readable and only removes navigation and focus.

## API

| Prop        | Type                            | Default     | Description                                 |
| ----------- | ------------------------------- | ----------- | ------------------------------------------- |
| `as`        | `string \| Component`           | `'a'`       | Element or router component                 |
| `href`      | `string`                        | —           | Address for `<a>`                           |
| `to`        | `unknown`                       | —           | Router destination; wins over `href`        |
| `tone`      | `NuiTone`                       | `'primary'` | Colour                                      |
| `underline` | `'always' \| 'hover' \| 'none'` | `'always'`  | When the underline shows                    |
| `external`  | `boolean`                       | `false`     | New tab, `rel`, icon                        |
| `disabled`  | `boolean`                       | `false`     | No address or focus, `aria-disabled="true"` |

Block `nui-link`, modifiers `--tone-*`, `--underline-*`, `--disabled`; element `__icon`;
variable `--_tone`.
