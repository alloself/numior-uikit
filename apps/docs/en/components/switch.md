# Switch

`NuiSwitch` is a native checkbox with `role="switch"` under an animated track and a `boolean`
model. The knob is described with logical properties, so in RTL it moves the right way.

<Example name="switch/Basic" />

## Installation

```ts
import { NuiSwitch } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/switch.css';
```

## Usage

<Configurator name="NuiSwitch" />

## Examples

### A settings list

The description under the label explains what the switch changes; `disabled` keeps the state
visible.

<Example name="switch/Settings" />

### Sizes

`size` changes the height of the track and the label with it.

<Example name="switch/Sizes" />

## Accessibility

A screen reader announces "on" and "off", the label is read from the slot, the focus ring is
drawn on the track.

<KeyboardReference name="NuiSwitch" />

## API

<ApiReference name="NuiSwitch" />
