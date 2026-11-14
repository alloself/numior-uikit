# Switch

A toggle for a setting that takes effect at once.

<Example name="switch/Basic" />

For a choice that applies only after the form is submitted, use a
[Checkbox](/en/components/checkbox).

## Installation

```ts install
import { NuiSwitch } from '@numior/vue';
```

## Usage

Change the size and the states of the switch.

<Configurator name="NuiSwitch" />

## Examples

### Build a list of settings

Explain in `description` what the switch changes.

<Example name="switch/Settings" />

## Accessibility

The switch is a native checkbox with the `switch` role, so a screen reader announces it as on or
off and reads the label. In right-to-left text the knob moves the other way.

<KeyboardReference name="NuiSwitch" />

## API

<ApiReference name="NuiSwitch" />
