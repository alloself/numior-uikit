# Theming

How to switch between the light and dark theme and change the accent color, density and
component colors.

<Example name="guide/Scheme" />

The colors, radii, spacing and sizes of components come from Tailwind theme keys:
`--color-primary`, `--radius-md`, `--spacing` and others. A color has a value for the light and
for the dark theme. The `nui-theme--light`, `nui-theme--dark` or `nui-theme--system` class picks
which one applies.

## Setup

Import the theme files in the app entry point:

```ts
import '@numior/tokens/theme.css';
import '@numior/tokens/base.css';
import '@numior/tokens/accents.css';
```

What `theme.css` and `base.css` do is covered in [Getting started](/en/guide/getting-started#styles).
You need `accents.css` only if you change the accent color with a `nui-theme--accent-<name>` class.

## Theme switcher

To let the user pick the theme, use `useColorScheme`:

```vue
<template>
  <NuiButton variant="ghost" tone="neutral" :aria-label="texts[scheme]" @click="cycle()">
    <NuiIcon :icon="icons[resolved]" />
  </NuiButton>
</template>

<script setup lang="ts">
import { NuiButton, NuiIcon, useColorScheme } from '@numior/vue';

const { scheme, resolved, cycle } = useColorScheme();
const icons = { light: 'sun', dark: 'moon' } as const;
const texts = { light: 'Light theme', dark: 'Dark theme', system: 'System theme' };
</script>
```

`scheme` is the theme the user picked: `light`, `dark` or `system`. `resolved` is the theme on
screen, `light` or `dark`. `cycle()` goes through the themes in turn, `toggle()` switches between
light and dark, and `set(theme)` sets the one you pass.

To keep the choice between visits, pass `colorScheme: { storageKey: 'theme' }` to
`createNuiConfig`. Then `useColorScheme()` in any component controls one theme for the whole app.

To keep the page from flashing the light theme on load, add the `colorSchemeScript('theme')`
script to `<head>`. It puts the class of the saved theme on `<html>` before the first paint.

## Theme one part of a page

The theme class works on any element: `nui-theme--dark` inside a light page makes only that part
dark. In the example at the top of the page, `useColorScheme({ scope })` puts the class on its own
block. The rest of the page stays as it is.

The `dark:` variant of Tailwind classes follows the nearest theme class. A page without a class
and an element with `nui-theme--system` follow the system setting.

## Accent color

A `nui-theme--accent-<name>` class changes the main color of buttons, switches, links and the
focus ring. The names are `indigo`, `blue`, `violet`, `emerald`, `teal`, `rose`, `orange`, `amber`
and `slate`.

The class sets only `--color-primary` and `--color-primary-foreground`. The soft background,
focus and hover inside the element follow them on their own.

<Example name="guide/Accent" />

## Custom colors

Your own colors, radii and font are keys in a `@theme` block. The
[Custom theme](/en/guide/custom-theme) guide builds one step by step, using the theme of this
site.

## Density

The `nui-theme--density-compact` class makes buttons and inputs shorter and reduces padding and
font size. Without it an `md` button is 2.5rem tall, and 2rem with it.

The `size` prop works with and without the class; with it every size is simply smaller. Put the
class on a table or a sidebar to make only them denser.

<Example name="guide/Density" />

## Tokens

Keys in the `@theme inline` block of `theme.css` are derived: their value is computed from base
keys where they are used. Set a base key and the derived ones change with it. A derived key can
be overridden only in your own `@theme`, it has no effect on a class.

| Group           | Keys                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Surfaces        | `--color-surface`, `-muted`, `-elevated`, `-overlay`, `--color-surface-ring`, `--color-backdrop`, `--color-surface-code`                                                                                                                                                                                                                                                                                                                                                           |
| Text            | `--color-foreground`, `--color-muted-foreground`, `--color-subtle-foreground`, `--color-code-inline`                                                                                                                                                                                                                                                                                                                                                                               |
| Borders         | `--color-border`, `--color-border-strong`                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Roles           | `primary`, `secondary`, `success`, `warning`, `error`, `info`, `neutral`: `--color-<role>`, `-foreground`; derived `-soft` and `-soft-foreground`                                                                                                                                                                                                                                                                                                                                  |
| Soft background | `-soft` mixes the tone with the background in `--color-layer`, or with `--color-surface` without it; popovers and menus set `--color-layer` on their own through `nui-layer`, `nui-layer--elevated` and `nui-surface--muted`, on your own panel set it to the panel background; `--soft-min-lightness` is the lowest lightness of a soft background                                                                                                                                |
| Focus           | `--color-ring` (derived, equal to `--color-primary`), `--focus-ring-width`, `--focus-ring-offset`, `--field-ring-width`, `--opacity-disabled`                                                                                                                                                                                                                                                                                                                                      |
| States          | `--state-hover`, `--state-pressed` — the share of its label colour a fill takes on hover and press: 8% and 16% across the kit; the derived `--color-hover` and `--color-pressed` — the same shares of the text colour over transparent items                                                                                                                                                                                                                                       |
| Shape           | `--radius-base`, derived `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius`; `--radius-full`                                                                                                                                                                                                                                                                                                                                                                   |
| Spacing         | `--spacing` — a 0.25rem step; `--spacing(4)` in CSS and `p-4` in classes give four steps                                                                                                                                                                                                                                                                                                                                                                                           |
| Typography      | `--font-sans`, `--font-mono`, `--text-xs…4xl`, `--font-weight-*`, `--leading-normal`, `--leading-tight`, `--leading-relaxed`, `--leading-control`, `--leading-label` (whole-pixel line boxes: single-line controls and wrapping labels), `--tracking-tight`, `--font-heading`, `--font-weight-heading`, `--font-weight-title`, `--tracking-heading`, `--container-prose`, `--spacing-icon`, `--spacing-icon-sm` (a 16 px icon next to 14 px text, always an even number of pixels) |
| Group captions  | `--font-weight-caption`, `--tracking-caption`, `--caption-transform` — the look of group captions in lists and the sidebar; `--caption-open`, `--caption-close` — marks around a caption, such as `'[ '` and `' ]'`                                                                                                                                                                                                                                                                |
| Article text    | `--prose-marker` — the list marker in `nui-prose`: `disc`, `square` or your own; `--color-prose-marker`                                                                                                                                                                                                                                                                                                                                                                            |
| Code            | `--color-syntax-keyword`, `-string`, `-number`, `-function`, `-type`, `-tag`, `-attribute`, `-property`, `-comment`, `-variable`, `-punctuation`, `-highlight`                                                                                                                                                                                                                                                                                                                     |
| Charts          | `--color-chart-1…8` (categorical palette checked for color blindness in both themes), `--color-chart-other`, `--color-chart-grid`, `--color-chart-axis`                                                                                                                                                                                                                                                                                                                            |
| Shadows         | `--shadow-sm`, `--shadow-md`, `--shadow-lg`                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Motion          | `--transition-duration-instant`, `-fast`, `-normal`, `-slow`, `--ease-nui`; hover and press use `fast`, a press starts at once (`instant`); under `prefers-reduced-motion` the durations are 0; infinite animations (spinners, skeletons, the loading bar) read `--nui-animation-play-state`, and `paused` on your own wrapper stops them, for example off screen                                                                                                                  |
| Layers          | `--z-index-dropdown`, `--z-index-overlay`, `--z-index-toast`                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Controls        | `--spacing-control-*`, `--spacing-control-pad-*`, `--spacing-field-pad-*`, `--text-control-*` for the sizes `xs`…`lg`; the derived `--spacing-control`, `--spacing-control-pad`, `--text-control` equal the `md` size                                                                                                                                                                                                                                                              |

`NuiDialog`, `NuiDrawer`, `NuiPopover` and `NuiTooltip` stay in the DOM next to the button that
opened them. So they get the same theme, density and writing direction as that button.
