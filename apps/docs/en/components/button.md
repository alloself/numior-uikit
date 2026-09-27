# Button

`NuiButton` is a native button with two styling axes: `variant` sets the shape, `tone` the role.
Role colours come from the tokens, so an accent change updates every variant at once.

<Example name="button/Basic" />

## Installation

```ts
import { NuiButton } from '@numior/vue';
import '@numior/vue/styles/button.css';
```

## Usage

<Configurator name="NuiButton" />

## Examples

### Sizes

`size` picks a step inside the current density; `data-nui-density` shifts the whole scale.

<Example name="button/Sizes" />

### States

`disabled` blocks activation. `loading` swallows presses too but keeps the width and the focus,
so the form does not jump.

<Example name="button/States" />

### With an icon

An icon in the slot sits before the text with the shared gap.

<Example name="button/WithIcon" />

### Icon only

A button with a lone icon squares itself; it needs an `aria-label`.

<Example name="button/IconOnly" />

### Link

`href` or `to` turn the button into a link with the same look; `as` takes a router component.

<Example name="button/Link" />

## Accessibility

The component stays a native `<button>` or `<a>`: keyboard, focus and screen readers work without
extra code. While `loading` the button gets `aria-busy` and stays in the tab order.

<KeyboardReference name="NuiButton" />

## API

<ApiReference name="NuiButton" />
