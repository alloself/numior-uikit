# Tailwind

How to lay out pages with Tailwind 4 classes in the colours and sizes of the Numior UI theme.

<Example name="guide/Tailwind" />

The `@numior/tailwind` preset links Tailwind classes to the theme tokens. `bg-surface`,
`text-muted-foreground`, `rounded-md` and `text-sm` give the same colours, radii and sizes as
the components. Every example in these docs is laid out this way.

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
| Colours           | `bg-surface`, `bg-surface-muted`, `bg-surface-elevated`, `bg-<role>`, `bg-<role>-soft`, `text-foreground`, `text-muted-foreground`, `text-subtle-foreground`, `text-<role>`, `text-<role>-foreground`, `border-border`, `border-border-strong`, `ring-ring`, `bg-surface-code`, `text-syntax-<scope>` |
| Radii             | `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl` from `--nui-radius-*`                                                                                                                                                                                                                          |
| Spacing           | the `p-*`, `m-*`, `gap-*` scale from `--nui-space-1`, that is 0.25rem per step                                                                                                                                                                                                                        |
| Fonts             | `font-sans`, `font-mono`, `font-heading`, `text-xs` … `text-4xl` with line heights from the tokens, `font-normal` … `font-bold`, `leading-tight`, `leading-relaxed`, `tracking-tight`, `tracking-heading`, `max-w-prose`                                                                              |
| Shadows           | `shadow-sm`, `shadow-md`, `shadow-lg`                                                                                                                                                                                                                                                                 |
| Motion            | `ease-nui`; Tailwind transitions use the `--nui-easing` curve by default                                                                                                                                                                                                                              |
| Grid and backdrop | `grid-auto`, `grid-auto-sm`, `grid-auto-lg`: a grid whose columns are at least 16, 12 or 20rem wide and wrap to a new row on their own; `bg-dots`: a dotted background                                                                                                                                |

Replace `<role>` with `primary`, `secondary`, `success`, `warning`, `error`, `info` or
`neutral`. The `border` class without a colour draws a border in `--nui-border`, as on the
components.

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
