# Theming

A theme is a set of CSS tokens from `@numior/tokens/theme.css`. The `data-nui-theme`
attribute on the root or on any area picks `light`, `dark` or `system`. Colours are written
through `light-dark()`, so the area inherits the right `color-scheme`.

The public contract is the semantic `--nui-*` tokens only.

<Example name="guide/Scheme" />

## Installation

```ts
import '@numior/tokens/theme.css';
import '@numior/tokens/base.css';
import '@numior/tokens/accents.css';
```

`base.css` removes the `body` margin and sets the page background, colour and font from the
tokens. `accents.css` adds the accent presets and is needed only with `data-nui-accent`.

## Switching the scheme

`useColorScheme` drives the `data-nui-theme` attribute: it reads the saved choice, follows
`prefers-color-scheme` and writes changes back. With the `colorScheme` option of
`createNuiConfig` the scheme is shared by the whole app, and `useColorScheme()` without
arguments returns it. With arguments a separate scheme is created for the `scope` area.

```vue
<template>
  <NuiButton variant="ghost" tone="neutral" :aria-label="texts[scheme]" @click="cycle()">
    <NuiIcon :alias="icons[resolved]" />
  </NuiButton>
</template>

<script setup lang="ts">
import { NuiButton, NuiIcon, useColorScheme } from '@numior/vue';

const { scheme, resolved, cycle } = useColorScheme();
const icons = { light: 'sun', dark: 'moon' } as const;
const texts = { light: 'Light theme', dark: 'Dark theme', system: 'System theme' };
</script>
```

`scheme` holds the choice (`light`, `dark`, `system`), `resolved` the actual scheme, and
`set`, `toggle` and `cycle` change it. To keep the page from flashing before hydration, put
the `colorSchemeScript(storageKey)` script into `<head>`: it applies the saved scheme before
the first paint.

## Accent

`data-nui-accent` swaps the `--nui-primary` and `--nui-primary-foreground` pair together with
the derived values: `indigo`, `blue`, `violet`, `emerald`, `teal`, `rose`, `orange`, `amber`,
`slate`.

<Example name="guide/Accent" />

## Own colours

Derived states (`soft`, hover, active, focus) are computed with `color-mix()` from the role
token. Replacing the `--nui-<role>` and `--nui-<role>-foreground` pair is enough.

Override tokens on the element with `data-nui-theme` or on `:root`. `var()` inside a custom
property resolves where it is declared, so on an ordinary element the inherited
`--nui-primary-soft` and `--nui-focus` keep the old values.

```css
[data-nui-theme] {
  --nui-primary: light-dark(oklch(0.55 0.2 300), oklch(0.8 0.12 300));
  --nui-primary-foreground: light-dark(oklch(1 0 0), oklch(0.25 0.08 300));
  --nui-radius-base: 0.75rem;
}
```

The radii derive from `--nui-radius-base`: `sm` is a half, `lg` one and a half, `xl` twice.

## Density

`data-nui-density="comfortable|compact"` shifts the scale of control heights, paddings and
font sizes; the `size` prop picks a step inside the scale. The attribute inherits, so a table
or a sidebar can be more compact than the page.

<Example name="guide/Density" />

## Tokens

| Group      | Tokens                                                                                                                                                               |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Surfaces   | `--nui-surface`, `-muted`, `-elevated`, `-overlay`, `--nui-ring`, `--nui-backdrop`, `--nui-surface-code`                                                             |
| Text       | `--nui-text`, `--nui-text-muted`, `--nui-text-subtle`, `--nui-code-inline`                                                                                           |
| Borders    | `--nui-border`, `--nui-border-strong`                                                                                                                                |
| Roles      | `primary`, `secondary`, `success`, `warning`, `error`, `info`, `neutral`: `--nui-<role>`, `-foreground`, `-soft`, `-soft-foreground`                                 |
| Focus      | `--nui-focus`, `--nui-focus-ring-width`, `--nui-focus-ring-offset`, `--nui-disabled-opacity`                                                                         |
| Shape      | `--nui-radius-base`, `--nui-radius-sm`, `--nui-radius-md`, `--nui-radius-lg`, `--nui-radius-xl`, `--nui-radius-full`, `--nui-radius`                                 |
| Spacing    | `--nui-space-1…6`, `--nui-space-8` (0.25rem step)                                                                                                                    |
| Typography | `--nui-font`, `--nui-font-mono`, `--nui-font-size-xs…4xl`, `--nui-font-weight-*`, `--nui-line-height`, `-tight`, `-relaxed`, `--nui-tracking-tight`, `--nui-measure` |
| Code       | `--nui-syntax-keyword`, `-string`, `-number`, `-function`, `-type`, `-tag`, `-attribute`, `-property`, `-comment`, `-variable`, `-punctuation`, `-highlight`         |
| Shadows    | `--nui-shadow-sm`, `--nui-shadow-md`, `--nui-shadow-lg`                                                                                                              |
| Motion     | `--nui-duration-fast`, `--nui-duration-normal`, `--nui-duration-slow`, `--nui-easing`; under `prefers-reduced-motion` the durations are 0                            |
| Layers     | `--nui-z-dropdown`, `--nui-z-overlay`, `--nui-z-toast`                                                                                                               |
| Controls   | `--nui-control-height-*`, `--nui-control-padding-*`, `--nui-field-padding-*`, `--nui-control-font-size-*` for `sm`, `md`, `lg` and the current step                  |

Layers (`NuiDialog`, `NuiDrawer`, `NuiPopover`, `NuiTooltip`) stay in the DOM of their
opener and inherit its theme, density and `dir` in the top layer.
