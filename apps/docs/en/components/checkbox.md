# Checkbox

`NuiCheckbox` is a native `<input type="checkbox">` under its own indicator with a `boolean`
model. `NuiCheckboxGroup` collects a set of values from options into an array in selection order.

<Example name="checkbox/Basic" />

## Installation

```ts
import { NuiCheckbox, NuiCheckboxGroup } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/checkbox.css';
```

## Usage

<Configurator name="NuiCheckbox" />

## Examples

### A set of values

`NuiCheckboxGroup` draws a `fieldset` with a label and a description; a disabled option stays in
the set but cannot be toggled.

<Example name="checkbox/Group" />

### In a row

`orientation="horizontal"` lays the options out in a wrapping row.

<Example name="checkbox/Horizontal" />

### Partial selection

`indeterminate` is the visual state of a parent checkbox while only some children are selected.
A click clears it and toggles the value as usual.

<Example name="checkbox/Indeterminate" />

## Accessibility

The control stays native: a screen reader reads the label from the slot, the focus ring is
drawn on the indicator. A set is a `fieldset` with a `legend`, the checkboxes inside share one
`name`.

<KeyboardReference name="NuiCheckbox" />

## API

<ApiReference :names="['NuiCheckbox', 'NuiCheckboxGroup']" />
