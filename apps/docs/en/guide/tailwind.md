# Tailwind

Page layout in projects on the kit is written with Tailwind 4 classes. The `@numior/tailwind`
preset puts the theme tokens on the standard names, so `bg-surface`, `text-muted-foreground`,
`rounded-md` and `text-sm` read the same variables as the components. The kit ships no
utilities of its own, and every example in these docs is laid out the same way.

<Example name="guide/Tailwind" />

## Installation

```ts
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: [tailwindcss()] });
```

```css
@import 'tailwindcss';
@import '@numior/tailwind/theme.css';
```

The preset goes after `tailwindcss` and next to `@numior/tokens/theme.css` in the app's
JavaScript or CSS. Its values are references to `--nui-*`, not copies. A scheme or accent
switch, or a token override on `[data-nui-theme]`, changes both the utilities and the
components.

## What the preset provides

| Group   | Utilities                                                                                                                                                                                                                                                                                             |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Colours | `bg-surface`, `bg-surface-muted`, `bg-surface-elevated`, `bg-<role>`, `bg-<role>-soft`, `text-foreground`, `text-muted-foreground`, `text-subtle-foreground`, `text-<role>`, `text-<role>-foreground`, `border-border`, `border-border-strong`, `ring-ring`, `bg-surface-code`, `text-syntax-<scope>` |
| Shape   | `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl` from `--nui-radius-*`                                                                                                                                                                                                                          |
| Spacing | the `p-*`, `m-*`, `gap-*` scale from `--nui-space-1`, that is 0.25rem per step                                                                                                                                                                                                                        |
| Fonts   | `font-sans`, `font-mono`, `text-xs` … `text-4xl` with line heights from the tokens, `font-normal` … `font-bold`, `leading-tight`, `leading-relaxed`, `tracking-tight`, `max-w-prose`                                                                                                                  |
| Shadows | `shadow-sm`, `shadow-md`, `shadow-lg`                                                                                                                                                                                                                                                                 |
| Motion  | `ease-nui`; default transitions run through `--nui-easing`                                                                                                                                                                                                                                            |
| Own     | `grid-auto`, `grid-auto-sm`, `grid-auto-lg`, a responsive `auto-fit` grid with a 16, 12 or 20rem minimum; `bg-dots`, the dotted preview backdrop                                                                                                                                                      |

Borders default to `--nui-border`, so a bare `border` matches the component frames. The roles
are `primary`, `secondary`, `success`, `warning`, `error`, `info`, `neutral`.

## Preflight and component styles

Preflight resets elements with zero-specificity selectors and the component classes are
stronger, so there is no conflict. The playground and these docs run under preflight.
`@numior/tokens/base.css` is not needed then: preflight together with the tokens sets the
`body` margin, the page background and the font.

## Prose

`.nui-prose` from `@numior/tokens/prose.css` styles bare content elements: headings,
paragraphs, lists, quotes, code, tables. A component class inside prose always wins, and
`.nui-not-prose` switches the styling off for a subtree. The `--size-sm` and `--size-lg`
modifiers change the scale.

<Example name="guide/Prose" />
