# Theming

How to switch between the light and dark theme and change the accent color, density and
component colors.

<Example name="guide/Scheme" />

The colors, radii, spacing and sizes of components come from the `--nui-*` CSS variables,
called tokens. Every token has a value for the light and for the dark theme. The
`data-nui-theme` attribute picks which one applies.

## Setup

Import the theme files in the app entry point:

```ts
import '@numior/tokens/theme.css';
import '@numior/tokens/base.css';
import '@numior/tokens/accents.css';
```

What `theme.css` and `base.css` do is covered in [Getting started](/en/guide/getting-started#styles).
You need `accents.css` only if you change the accent color with the `data-nui-accent` attribute.

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
script to `<head>`. It applies the saved theme before the first paint.

## Accent color

The `data-nui-accent` attribute changes the main color of buttons, switches, links and the focus
ring. The values are `indigo`, `blue`, `violet`, `emerald`, `teal`, `rose`, `orange`, `amber` and
`slate`.

<Example name="guide/Accent" />

## Custom colors

Your own colors, radii and font live in a theme file. The [Custom theme](/en/guide/custom-theme)
guide builds one step by step, using the theme of this site.

## Density

The `data-nui-density="compact"` attribute makes buttons and inputs shorter and reduces padding
and font size. The default is `comfortable`: an `md` button is 2.5rem tall, and 2rem in `compact`.

The `size` prop works in both modes; in `compact` every size is simply smaller. Put the
attribute on a table or a sidebar to make only them denser.

<Example name="guide/Density" />

## Tokens

| Group          | Tokens                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Surfaces       | `--nui-surface`, `-muted`, `-elevated`, `-overlay`, `--nui-ring`, `--nui-backdrop`, `--nui-surface-code`                                                                                                                                                                                                                                                                                               |
| Text           | `--nui-text`, `--nui-text-muted`, `--nui-text-subtle`, `--nui-code-inline`                                                                                                                                                                                                                                                                                                                             |
| Borders        | `--nui-border`, `--nui-border-strong`                                                                                                                                                                                                                                                                                                                                                                  |
| Roles          | `primary`, `secondary`, `success`, `warning`, `error`, `info`, `neutral`: `--nui-<role>`, `-foreground`, `-soft`, `-soft-foreground`                                                                                                                                                                                                                                                                   |
| Focus          | `--nui-focus`, `--nui-focus-ring-width`, `--nui-focus-ring-offset`, `--nui-field-ring-width`, `--nui-disabled-opacity`                                                                                                                                                                                                                                                                                 |
| States         | `--nui-state-hover`, `--nui-state-pressed` — the lightness step of solid buttons; `-subtle` — the step of tinted fills (soft buttons, selected items); `-overlay` — the text share of `--nui-hover` and `--nui-pressed` over transparent items; `-tint` — the tone share of ghost and outline buttons                                                                                                  |
| Shape          | `--nui-radius-base`, `--nui-radius-sm`, `--nui-radius-md`, `--nui-radius-lg`, `--nui-radius-xl`, `--nui-radius-full`, `--nui-radius`                                                                                                                                                                                                                                                                   |
| Spacing        | `--nui-space-1…6`, `--nui-space-8` (0.25rem step)                                                                                                                                                                                                                                                                                                                                                      |
| Typography     | `--nui-font`, `--nui-font-mono`, `--nui-font-size-xs…4xl`, `--nui-font-weight-*`, `--nui-line-height`, `-tight`, `-relaxed`, `--nui-tracking-tight`, `--nui-font-heading`, `--nui-font-weight-heading`, `--nui-font-weight-title`, `--nui-tracking-heading`, `--nui-measure`                                                                                                                           |
| Group captions | `--nui-caption-weight`, `-tracking`, `-transform` — the look of group captions in lists and the sidebar; `--nui-caption-open`, `-close` — marks around a caption, such as `'[ '` and `' ]'`                                                                                                                                                                                                            |
| Article text   | `--nui-prose-marker` — the list marker in `nui-prose`: `disc`, `square` or your own; `--nui-prose-marker-color`                                                                                                                                                                                                                                                                                        |
| Code           | `--nui-syntax-keyword`, `-string`, `-number`, `-function`, `-type`, `-tag`, `-attribute`, `-property`, `-comment`, `-variable`, `-punctuation`, `-highlight`                                                                                                                                                                                                                                           |
| Charts         | `--nui-chart-1…8` (categorical palette checked for color blindness in both themes), `--nui-chart-other`, `--nui-chart-grid`, `--nui-chart-axis`                                                                                                                                                                                                                                                        |
| Shadows        | `--nui-shadow-sm`, `--nui-shadow-md`, `--nui-shadow-lg`                                                                                                                                                                                                                                                                                                                                                |
| Motion         | `--nui-duration-instant`, `--nui-duration-fast`, `--nui-duration-normal`, `--nui-duration-slow`, `--nui-easing`; hover and press use `fast`, a press starts at once (`instant`); under `prefers-reduced-motion` the durations are 0; infinite animations (spinners, skeletons, the loading bar) read `--nui-animation-play-state`, and `paused` on your own wrapper stops them, for example off screen |
| Layers         | `--nui-z-dropdown`, `--nui-z-overlay`, `--nui-z-toast`                                                                                                                                                                                                                                                                                                                                                 |
| Controls       | `--nui-control-height-*`, `--nui-control-padding-*`, `--nui-field-padding-*`, `--nui-control-font-size-*` for `sm`, `md`, `lg` and the current size                                                                                                                                                                                                                                                    |

`NuiDialog`, `NuiDrawer`, `NuiPopover` and `NuiTooltip` stay in the DOM next to the button that
opened them. So they get the same theme, density and writing direction as that button.
