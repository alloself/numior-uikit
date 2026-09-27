# Tailwind

The integration is optional: the components need neither Tailwind nor its preflight.
`@numior/tailwind` binds the theme tokens to Tailwind 4 utilities through `@theme inline`, so
`bg-primary` and `NuiButton` paint from one variable and switch schemes together.

## Installation

```css
@import 'tailwindcss';
@import '@numior/tokens/theme.css';
@import '@numior/tailwind/theme.css';
```

## What is available

| Group   | Utilities                                                                                                                                                                                    |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Colours | `bg-surface`, `bg-surface-muted`, `bg-<role>`, `bg-<role>-soft`, `text-foreground`, `text-muted-foreground`, `text-<role>-foreground`, `border-border`, `border-border-strong`, `ring-focus` |
| Shape   | `rounded-nui`, `rounded-nui-sm`, `rounded-nui-lg`, `rounded-nui-full`                                                                                                                        |
| Spacing | `p-nui-1` … `p-nui-8`, `gap-nui-4`, `m-nui-2`                                                                                                                                                |
| Fonts   | `font-nui`, `font-nui-mono`, `text-nui-xs` … `text-nui-4xl`                                                                                                                                  |
| Shadows | `shadow-nui-sm`, `shadow-nui-md`, `shadow-nui-lg`                                                                                                                                            |
| Motion  | `duration-nui-fast`, `duration-nui-normal`, `duration-nui-slow`, `ease-nui`                                                                                                                  |

The values are references to `--nui-*`, not copies: overriding a token on `[data-nui-theme]`
changes both the utilities and the components.

## Preflight and component styles

Tailwind's preflight resets elements with zero-specificity selectors, and the component
classes are stronger, so there is no conflict. With the preflight disabled, add
`@numior/tokens/base.css` for the `body` margin and the page font. The `@numior/utilities`
classes can stay out: they duplicate part of Tailwind.
