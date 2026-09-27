# Smart form

`NuiSmartForm` builds a form from a `formConfig<Values>()` configuration: fields with any kit
control, sections with their own layout, conditional fields, repeated groups and steps. Under
the hood it is the same `useForm`, `NuiForm`, `NuiFormField` and `NuiFieldArray` as in the
[plain form](/en/components/form).

<Example name="smart-form/Profile" />

## Installation

```ts
import { NuiSmartForm, formConfig, useForm } from '@numior/forms';
import '@numior/forms/styles/form.css';
import '@numior/forms/styles/field-array.css';
import '@numior/forms/styles/smart-form.css';
```

## Examples

### Steps

`steps` instead of `fields` makes a wizard. A step is validated before moving on,
`v-model:step` holds the current one, and the last step submits the form.

<Example name="smart-form/Wizard" />

### Filters in a row

`inline` puts the fields in a row for filters above a table; in a narrow container they wrap.

<Example name="smart-form/Inline" />

## Configuration

`field(Component, (v) => v.email, options)` describes a field: the control, the value selector
and `label`, `description`, `required`, `rules`, the control `props`, `when` and `area`. The
value type is inferred from the selector and checked against the control model; `model: 'values'`
plugs in a control with a named model. `section({ title, layout, fields })` renders a
`fieldset`, `array((v) => v.contacts, { newRow, fields })` a repeated group whose row fields come
from `formConfig<Row>()`.

## Conditions and layout

`when(values, row)` shows a field, section or group while it returns `true`; a hidden field
leaves validation and submission but keeps its value. `layout` uses the `grid-template-areas`
syntax with field paths or `area` as area names. Narrower than `36rem` the layout folds into one
column, so the same form works in a dialog and on a phone.

## Slots

A slot named after a field path is the control content: the radios of a group, the label of a
checkbox. It receives `error`, `invalid`, `touched`, `pending` and, inside a group, `row`. The
`actions` slot replaces the buttons and receives `submit`, `reset`, `pending`, `dirty` and the
steps.

## API

<ApiReference name="NuiSmartForm" />
