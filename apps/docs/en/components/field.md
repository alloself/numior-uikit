# Field

A label, a hint and an error around any control.

<Example name="field/Basic" />

Numior UI inputs take `label`, `description` and `error` themselves, so wrap a control in
`NuiField` for a label with markup or for several controls.

## Installation

```ts install
import { NuiField } from '@numior/vue';
```

## Usage

Add a hint and an error, or mark the field as required, disabled or read-only.

<Configurator name="NuiField" />

## Examples

### Add a link to the label

Pass markup into the `label`, `description` and `error` slots.

<Example name="field/Slots" />

### Group several controls

Add `group` to put the controls under one label.

<Example name="field/Group" />

A screen reader names the group by its label, and `disabled` turns off every control in it.

### Stop an error from shifting the form

Turn on `reserveError`.

<Example name="field/Reserve" />

The line under the control stays empty until the error comes. Set `reserveError` on `NuiForm`
to keep this room under every field of the form.

## Custom control

Link your own input to the field with [useFieldControl](/en/composables/field-control), and it
gets the label, the hint and the error.

Place the label, the hint and the error in your own markup with `NuiFieldLabel`,
`NuiFieldDescription` and `NuiFieldError`. They read the field from the nearest `NuiField` or
from one you create with `provideField` from `@numior/primitives`.

## Accessibility

A click on the label focuses the control, and a screen reader reads the hint and the error
together with the field.

## API

<ApiReference :names="['NuiField', 'NuiFieldLabel', 'NuiFieldDescription', 'NuiFieldError']" />
