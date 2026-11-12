# Tooltip

A short hint for a button or an icon.

<Example name="tooltip/Basic" />

Put the element into the `trigger` slot the same way as in a [Popover](/en/components/popover).

## Installation

```ts
import { NuiTooltip } from '@numior/vue';
import '@numior/vue/styles/tooltip.css';
```

## Usage

Hover over the button and change the side of the tooltip, its offset and its delays.

<Configurator name="NuiTooltip" />

## Examples

### Label an icon button

Keep `aria-label` on the button: the tooltip becomes its description, not its name.

<Example name="tooltip/IconButton" />

## Accessibility

The tooltip follows WCAG 1.4.13:

- Esc hides it.
- The pointer can move onto the tooltip, and it stays open.
- It does not disappear on a timer, only when the pointer or the focus leaves.

A screen reader reads the tooltip as the description of the element through `aria-describedby`.
Touch screens do not show tooltips, so keep anything the user needs out of them.

<KeyboardReference name="NuiTooltip" />

## API

<ApiReference name="NuiTooltip" />
