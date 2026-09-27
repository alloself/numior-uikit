# Popover

`NuiPopover` builds on the Popover API: the content gets `popover="auto"`, the trigger
`popovertarget`. The browser opens the layer in the top layer and closes it on Esc and on an
outside click. The content sits right after the trigger in the tab order.

<Example name="popover/Basic" />

## Installation

```ts
import { NuiPopover } from '@numior/vue';
import '@numior/vue/styles/popover.css';
```

## Examples

### Placement

`placement` sets the side and the alignment; the layer flips and shifts when it does not fit.
`offset` is the distance to the trigger.

<Example name="popover/Placement" />

## Accessibility

The `trigger` slot hands out `attrs` with `popovertarget`, `aria-expanded` and `aria-controls`;
bind them to any button with `v-bind`. The content stays in the DOM next to the trigger, so it
inherits the theme and `dir` and ignores the `overflow` of ancestors.

<KeyboardReference name="NuiPopover" />

## API

<ApiReference name="NuiPopover" />
