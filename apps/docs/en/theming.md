# Theming

Import `@numior/tokens/theme.css`. Set `data-nui-theme="light|dark|system"` on
the document root or a scope; system is the default. Colors use CSS `light-dark()`,
so the scope must inherit the correct `color-scheme`. A nested theme attribute
starts its own preset.

```html
<section
  data-nui-theme="dark"
  data-nui-density="compact"
  style="--nui-primary: oklch(0.87 0.14 154); --nui-primary-foreground: oklch(0.27 0.06 153)"
>
  <!-- Components in this scope -->
</section>
```

Only semantic tokens are public. Values are `oklch()` inside `light-dark()`, and
derived states (soft, hover, active) are computed with `color-mix()` from the role
token, so replacing one `--nui-<role>` / `--nui-<role>-foreground` pair is enough.
Verify the contrast of both sides of the pair.

::: warning Override scope
`var()` inside a custom property resolves on the element that declares it.
Override role tokens on an element with `data-nui-theme` (or on `:root`).
If you override `--nui-primary` on a plain element, the inherited
`--nui-primary-soft` and `--nui-focus` keep their old values: set them too.
:::

## Tokens

| Group      | Tokens                                                                                                                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Surfaces   | `--nui-surface`, `--nui-surface-muted`, `--nui-surface-elevated`, `--nui-surface-overlay`, `--nui-ring` (ring around overlapping elements), `--nui-backdrop` (dimming under modal layers) |
| Text       | `--nui-text`, `--nui-text-muted`, `--nui-text-subtle`                                                                                                                                     |
| Borders    | `--nui-border`, `--nui-border-strong`                                                                                                                                                     |
| Roles      | `primary`, `secondary`, `success`, `warning`, `error`, `info`, `neutral`: `--nui-<role>`, `--nui-<role>-foreground`, `--nui-<role>-soft`, `--nui-<role>-soft-foreground`                  |
| Focus      | `--nui-focus`, `--nui-focus-ring-width`, `--nui-focus-ring-offset`                                                                                                                        |
| States     | `--nui-disabled-opacity`                                                                                                                                                                  |
| Radius     | `--nui-radius-sm`, `--nui-radius-md`, `--nui-radius-lg`, `--nui-radius-full`; `--nui-radius` = md                                                                                         |
| Space      | `--nui-space-1` … `--nui-space-6`, `--nui-space-8` (0.25rem steps)                                                                                                                        |
| Typography | `--nui-font`, `--nui-font-mono`, `--nui-font-size-xs/sm/md/lg`, `--nui-line-height`, `--nui-line-height-tight`                                                                            |
| Shadows    | `--nui-shadow-sm`, `--nui-shadow-md`, `--nui-shadow-lg`                                                                                                                                   |
| Motion     | `--nui-duration-fast`, `--nui-duration-normal`, `--nui-duration-slow`, `--nui-easing`; under `prefers-reduced-motion: reduce` durations become `0ms`                                      |
| Layers     | `--nui-z-dropdown`, `--nui-z-overlay`, `--nui-z-toast`                                                                                                                                    |
| Controls   | `--nui-control-height-sm/md/lg`, `--nui-control-padding-sm/md/lg`, `--nui-control-font-size-sm/md/lg`; `--nui-control-height`, `--nui-control-padding`, `--nui-control-font-size` = md    |

## Switching the color scheme

`useColorScheme` from `@numior/vue` drives `data-nui-theme` on a scope: it reads the
current attribute or a stored choice, follows `prefers-color-scheme` and writes changes
back. On the server it returns `system`/`light` without touching the DOM.

```vue
<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useColorScheme } from '@numior/vue';

const root = useTemplateRef<HTMLElement>('root');
const { scheme, resolved, toggle } = useColorScheme({ scope: root, storageKey: 'theme' });
</script>

<template>
  <div ref="root" data-nui-theme="system">
    <button @click="toggle()">Now {{ resolved }}</button>
  </div>
</template>
```

Without `scope` the root element is `document.documentElement`; `storageKey` enables
`localStorage` persistence. Layers (`NuiDialog`, `NuiDrawer`, `NuiPopover`, `NuiTooltip`)
stay in the initiator's DOM and inherit its theme, density and `dir` in the top layer
with no extra code.

## Density and sizes

`data-nui-density="comfortable|compact"` shifts the whole control scale and is
inherited through nested themes. The size of a particular element is chosen by its
`size` prop (`sm`, `md`, `lg`) within the current scale. Heights are 1.75 / 2 / 2.5rem
in `compact` and 2 / 2.5 / 3rem in `comfortable`.

## Standalone utilities

Import `@numior/utilities/utilities.css`. The `nui-*` classes read the same tokens:
`nui-flex`, `nui-wrap`, `nui-items-center`, `nui-gap-1…4`, `nui-bg-surface(-muted|-elevated)`,
`nui-bg-<role>`, `nui-bg-<role>-soft`, `nui-text`, `nui-text-muted`, `nui-text-subtle`,
`nui-text-<role>`, `nui-text-<role>-foreground`, `nui-border(-strong)`,
`nui-rounded(-sm|-lg|-full)`, `nui-shadow-sm|md`.

## Tailwind 4

The integration is optional. In a consumer with Tailwind 4 configured:

```css
@import 'tailwindcss';
@import '@numior/tokens/theme.css';
@import '@numior/tailwind/theme.css';
```

Available: `bg-primary`, `bg-primary-soft`, `text-primary-foreground`, `bg-surface`,
`text-subtle-foreground`, `border-border-strong`, `rounded-nui(-sm|-lg|-full)`,
`p-nui-4`, `font-nui`, `text-nui-sm`, `shadow-nui-md`, `ease-nui`. `@theme inline`
maps these to CSS variables, so runtime themes match Vue components. Components do
not require Tailwind or its preflight.

Theme propagation through portals/overlays will arrive with those primitives;
the foundation currently verifies ordinary DOM nesting.
