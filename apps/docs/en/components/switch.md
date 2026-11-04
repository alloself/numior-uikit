# Switch

`NuiSwitch` is a toggle for a setting that applies at once, without a "Save" button:
notifications, public access, dark theme. The model holds `true` or `false`.

<Example name="switch/Basic" />

Pass the label into the default slot or `label`, and the hint under it into `description`. For
a choice that applies only after the form is submitted, a [Checkbox](/en/components/checkbox)
fits better.

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

Use `description` to explain what changes after the toggle. A `disabled` switch still shows
whether the setting is on or off.

<Example name="switch/Settings" />

### Sizes

`size` takes `sm`, `md` and `lg` and changes the size of the switch along with its label.

<Example name="switch/Sizes" />

## Accessibility

The switch is a native checkbox with the `switch` role: a screen reader announces it as "on" or
"off" and reads the label. In right-to-left text the knob moves the other way.

<KeyboardReference name="NuiSwitch" />

## API

<ApiReference name="NuiSwitch" />
