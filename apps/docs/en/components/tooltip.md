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

### Show a keyboard shortcut

Set `shortcut` and import `@numior/vue/styles/kbd.css`.

<Example name="tooltip/Shortcut" />

A combination uses the notation of [Kbd](/en/components/kbd): `mod+shift+c` reads ⇧ ⌘ C on a Mac
and Ctrl Shift C on Windows. For a tooltip with targets in `anchor`, pass a function: it receives
the element under the pointer and returns its combination.

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
