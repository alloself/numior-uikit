# Field

`NuiField` shows a label, a hint and an error around a control and connects them to it for screen
readers. Kit inputs show these texts on their own, so `NuiField` is for a label with markup or a
field with several controls.

<Example name="field/Basic" />

The `required` prop adds an asterisk to the label, and `error` puts the control into the error
state and shows the text under it.

## Installation

```ts
import { NuiField } from '@numior/vue';
import '@numior/vue/styles/field.css';
```

## Examples

### Label with markup

The `label`, `description` and `error` slots take markup instead of text: a link next to the
label, a bold word in the hint.

<Example name="field/Slots" />

### A group of controls

With `group`, the field puts several controls under one label, such as first and last name.
Screen readers name the group by its label, and `disabled` turns off all the controls at once.

<Example name="field/Group" />

### Room for the error

`reserveError` keeps a line under the control for the error in advance. When a message appears
after a submit, the fields and buttons nearby stay in place. The `reserveError` prop of `NuiForm`
turns this on for every field of the form.

<Example name="field/Reserve" />

## Accessibility

A click on the label focuses the control, and screen readers read the hint and the error together
with the field. The connections are already in the server-rendered markup, before scripts load.

The `NuiFieldLabel`, `NuiFieldDescription` and `NuiFieldError` parts show the label, the hint and
the error in your own markup. They take their data from the nearest `NuiField` or from a field
created with `provideField` from `@numior/primitives`.

## API

<ApiReference :names="['NuiField', 'NuiFieldLabel', 'NuiFieldDescription', 'NuiFieldError']" />
