# Tailwind

How to lay out pages with Tailwind 4 classes in the colors and sizes of the Numior UI theme.

<Example name="guide/Tailwind" />

Tailwind classes hold the order card together: the border, the background, the spacing and the
layout. The avatar, the status and the buttons inside it come from the library.

The `@numior/tailwind` preset links the classes to the theme tokens. `bg-surface-elevated`,
`text-muted-foreground`, `rounded-lg` and `text-sm` give the same colors, radii and sizes as the
components.

## Installation

Add the Tailwind plugin to `vite.config.ts`:

```ts
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: [tailwindcss()] });
```

Then import the preset in CSS after `tailwindcss`:

```css
@import 'tailwindcss';
@import '@numior/tailwind/theme.css';
```

The preset needs the tokens from `@numior/tokens/theme.css`, so import them too. The classes
refer to the `--nui-*` variables. So when the theme, the accent or a token value changes, both
the classes and the components change.

## Preset classes

| Group             | Classes                                                                                                                                                                                                                                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Colors            | `bg-surface`, `bg-surface-muted`, `bg-surface-elevated`, `bg-<role>`, `bg-<role>-soft`, `text-foreground`, `text-muted-foreground`, `text-subtle-foreground`, `text-<role>`, `text-<role>-foreground`, `border-border`, `border-border-strong`, `ring-ring`, `bg-surface-code`, `text-syntax-<scope>` |
| Radii             | `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl` from `--nui-radius-*`                                                                                                                                                                                                                          |
| Spacing           | the `p-*`, `m-*`, `gap-*` scale from `--nui-space-1`, that is 0.25rem per step                                                                                                                                                                                                                        |
| Fonts             | `font-sans`, `font-mono`, `font-heading`, `text-xs` … `text-4xl` with line heights from the tokens, `font-normal` … `font-bold`, `leading-tight`, `leading-relaxed`, `tracking-tight`, `tracking-heading`, `max-w-prose`                                                                              |
| Shadows           | `shadow-sm`, `shadow-md`, `shadow-lg`                                                                                                                                                                                                                                                                 |
| Motion            | `ease-nui`; Tailwind transitions use the `--nui-easing` curve by default                                                                                                                                                                                                                              |
| Grid and backdrop | `grid-auto`, `grid-auto-sm`, `grid-auto-lg`: a grid whose columns are at least 16, 12 or 20rem wide and wrap to a new row on their own; `bg-dots`: a dotted background                                                                                                                                |

Replace `<role>` with `primary`, `secondary`, `success`, `warning`, `error`, `info` or
`neutral`. The `border` class without a color draws a border in `--nui-border`, as on the
components.

## Classes on components

A class on a component tag lands on its root element. Use it to place the component in a layout.
`w-full` stretches it to the column width, `col-span-2` takes two grid columns, and `mt-4` moves
it away from its neighbor.

```html
<form class="grid grid-cols-2 gap-4">
  <NuiInput v-model="name" class="col-span-2" />
  <NuiButton type="submit" class="w-full">Save</NuiButton>
</form>
```

Classes cannot override the color, height or radius of a component: component styles sit outside
CSS layers and win over Tailwind utilities. Change them with the `tone`, `variant` and `size`
props and with theme tokens.

## Preflight and component styles

Preflight, the Tailwind style reset, does not conflict with components: its selectors are
weaker than the component classes. With Tailwind you do not need `@numior/tokens/base.css`:
preflight removes the `body` margin and takes the font from the preset tokens. Set the page
background with the `bg-surface` class.

## Text styling

Add the `.nui-prose` class from `@numior/tokens/prose.css` to a block with an article or CMS
text. Headings, paragraphs, lists, quotes, code and tables inside it get styled without their
own classes.

Components inside such a block look as usual. The `.nui-not-prose` class turns the styling off
inside an element, and the `--size-sm` and `--size-lg` modifiers make the text smaller or
larger.

<Example name="guide/Prose" />
