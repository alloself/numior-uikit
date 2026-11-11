# Tooltip

`NuiTooltip` is a popup with a short hint for a button or another element. It appears on hover
and on keyboard focus.

<Example name="tooltip/Basic" />

The element the tooltip belongs to goes into the `trigger` slot and receives `attrs` from it: the
handlers and `aria-describedby`. The tooltip appears 300 ms after hover, and at once on focus.
`openDelay` changes the delay, and `placement` sets the side, `top` by default.

## Installation

```ts
import { NuiTooltip } from '@numior/vue';
import '@numior/vue/styles/tooltip.css';
```

## Usage

Hover over the button and change the side of the tooltip, its offset and the delays.

<Configurator name="NuiTooltip" />

## Examples

### Icon button

A tooltip adds to the name of a button but does not stand in for it, so an icon-only button still
needs an `aria-label`.

<Example name="tooltip/IconButton" />

## Accessibility

The tooltip follows WCAG 1.4.13: Esc closes it, the pointer can move onto it, and it never
disappears on a timer. It hides when the pointer leaves or the element loses focus.

Screen readers read the tooltip text as the description of the element through
`aria-describedby`. Touch screens never show the tooltip, so do not put anything in it that the
interface cannot be understood without.

<KeyboardReference name="NuiTooltip" />

## API

<ApiReference name="NuiTooltip" />
