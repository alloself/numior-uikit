# Field

`NuiField` links a control with its label, description and error through a shared `id`,
`aria-describedby` and `aria-invalid`. Controls draw their own texts; the field serves slots,
several controls in one field and forms.

<Example name="field/Basic" />

## Installation

```ts
import { NuiField } from '@numior/vue';
import '@numior/vue/styles/field.css';
```

## Examples

### Slots

The label, description and error take markup through the `label`, `description` and `error`
slots.

<Example name="field/Slots" />

### A group of controls

`group` turns the field into a `<fieldset>` with a `<legend>`; the controls inside keep their
own `id`, and `disabled` applies to the whole `fieldset`.

<Example name="field/Group" />

### Room for the error

`reserveError` keeps an empty line under the control, so neighbouring fields and buttons do not
move when messages appear after a submit. `NuiForm` passes it to every field.

<Example name="field/Reserve" />

## Accessibility

Markup: `<label for>`, the control with the same `id`, the description and the error with ids
listed in `aria-describedby`. Every link is computed on the server, so SSR and hydration render
the same markup. The `NuiFieldLabel`, `NuiFieldDescription` and `NuiFieldError` parts build a
custom field on top of `provideField` from `@numior/primitives`.

## API

<ApiReference :names="['NuiField', 'NuiFieldLabel', 'NuiFieldDescription', 'NuiFieldError']" />
