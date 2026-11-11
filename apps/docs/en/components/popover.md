# Popover

`NuiPopover` is a floating panel next to a button: an author card, a short form, settings. The
panel closes on Esc and on a click outside it, and on the keyboard Tab reaches its content
right after the button.

<Example name="popover/Basic" />

Put the button into the `trigger` slot and pass it `attrs` with `v-bind`. Whether the panel is
open lives in `v-model:open`, and the `arrow` prop adds an arrow pointing at the button.

## Installation

```ts
import { NuiPopover } from '@numior/vue';
import '@numior/vue/styles/popover.css';
```

## Usage

Open the popover and change its side, arrow, padding and the way it opens.

<Configurator name="NuiPopover" />

## Examples

### Placement

`placement` sets the side and the alignment, such as `top`, `bottom-start` or `right-end`. When
the panel does not fit, it opens on the other side or shifts to stay inside the window.
`offset` is the distance from the button in pixels, 8 by default.

<Example name="popover/Placement" />

### On hover

With `trigger="hover"` the panel opens when the pointer rests on the button and closes shortly
after the pointer leaves. `openDelay` and `closeDelay` set the pauses, 400 and 200 ms by
default.

While the pointer is over the panel itself, it stays open. On the keyboard the panel opens when
the button gets focus, on a phone on a tap.

<Example name="popover/Hover" />

## Accessibility

The `attrs` of the `trigger` slot carry `aria-expanded` and `aria-controls`, so a screen reader
announces whether the panel is open. Any button or link works once it gets `attrs`.

The panel stays in the markup next to the button. It therefore takes the theme and the text
direction of its place on the page, and `overflow: hidden` on parents does not clip it.

<KeyboardReference name="NuiPopover" />

## API

<ApiReference name="NuiPopover" />
