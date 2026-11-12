# Popover

A floating panel next to a button.

<Example name="popover/Basic" />

Put the button into the `trigger` slot and pass it the slot's `attrs` with `v-bind`.

## Installation

```ts
import { NuiPopover } from '@numior/vue';
import '@numior/vue/styles/popover.css';
```

## Usage

Open the popover and change its side, arrow, padding and the way it opens.

<Configurator name="NuiPopover" />

## Examples

### Open on hover

Set `trigger="hover"`.

<Example name="popover/Hover" />

On the keyboard the panel opens when the trigger gets focus, and on a touch screen it opens on a
tap. It stays open while the pointer is over it, so the user can click a link inside.

## Behavior

When the panel does not fit on its side, it flips to the opposite side or shifts to stay on screen.

## Accessibility

Esc and a click outside close the panel. Tab moves from the button into the panel and then on
through the page.

The `attrs` give the button `aria-expanded` and `aria-controls`, so a screen reader announces
whether the panel is open.

The panel stays in the markup next to the button, so it takes the theme and the text direction of
that place. A parent with `overflow: hidden` does not clip it.

<KeyboardReference name="NuiPopover" />

## API

<ApiReference name="NuiPopover" />
