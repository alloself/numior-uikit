# Tooltip

`NuiTooltip` is a hint with `role="tooltip"` linked to its trigger through `aria-describedby`.
It appears on hover after a delay and at once on focus. It hides when the pointer leaves, on
blur and on Esc; the pointer can move onto the tooltip without closing it.

<Example name="tooltip/Basic" />

## Installation

```ts
import { NuiTooltip } from '@numior/vue';
import '@numior/vue/styles/tooltip.css';
```

## Examples

### An icon button

The tooltip describes the trigger instead of naming it: a button without text still needs an
`aria-label`.

<Example name="tooltip/IconButton" />

## Accessibility

The behaviour follows WCAG 1.4.13: it closes on Esc, stays while hovered and never disappears on
its own. Touch screens never show the tooltip, so its text must not be the only source of the
information.

<KeyboardReference name="NuiTooltip" />

## API

<ApiReference name="NuiTooltip" />
