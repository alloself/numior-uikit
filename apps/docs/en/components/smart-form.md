# Smart form

`NuiSmartForm` builds a form from a description of its fields, with no markup for each field.
Use it for routine forms such as a profile, settings or filters, and for forms that come from
the server as JSON.

<Example name="smart-form/Profile" />

`formConfig<Values>()` describes the fields: any Numior input, sections, conditional fields,
repeated groups and steps. Validation and submission run on the same `useForm` as in the
[plain form](/en/components/form).

## Installation

```ts
import { NuiSmartForm, formConfig, useForm } from '@numior/forms';
import '@numior/forms/styles/form.css';
import '@numior/forms/styles/field-array.css';
import '@numior/forms/styles/smart-form.css';
```

## Examples

### Steps

Pass `steps` instead of `fields`, and the form becomes a wizard. Moving on is possible only when
the fields of the current step pass validation. The open step lives in `v-model:step`, and the
button on the last step submits the form.

<Example name="smart-form/Wizard" />

### Filters in a row

With `inline` the fields line up in one row, like filters above a table. When there is not
enough room, the fields wrap to the next line.

<Example name="smart-form/Inline" />

## Configuration

`field(Component, (v) => v.email, options)` describes a field: the component, a function that
picks the value from the form model, and the options. The options are `label`, `description`,
`required`, `rules`, the component `props`, `when` and `area`.

TypeScript infers the value type from the picking function and checks it against the component
model. When the component keeps its value in a named model instead of `v-model`, name it:
`model: 'values'`.

`section({ title, layout, fields })` renders a group of fields under one title.
`array((v) => v.contacts, { newRow, fields })` renders a repeated group, such as a list of
contacts. A separate `formConfig<Row>()` describes the fields of one row.

## Conditions and layout

A field, section or group is visible while its `when(values, row)` returns `true`. A hidden
field is neither validated nor submitted, but its value is kept and comes back when the field
reappears.

`layout` is written like the CSS `grid-template-areas` property, with field paths or their `area`
as area names. When the form is narrower than `36rem`, the fields stack in one column, so one
form fits both a dialog and a phone.

## From JSON

`parseFormConfig(json, { controls })` builds a configuration from JSON. A field in JSON has a
string `type` from the component registry, a `name` path, `props` and a `when` condition. The
rules are `required`, `min`, `max`, `email` and `pattern`.

The component from the registry checks its own `props`. An unknown type, rejected `props` or an
unreadable entry give a list of `issues` instead of a form. Each issue has an error code and a
path.

A `pattern` rule whose `source` is not a regular expression is reported in `issues` too. The path
leads to the rule itself, such as `fields.0.rules.1`.

`formConfig({ controls }).control('select', (v) => v.country, { props })` takes a component from
the registry by key, and TypeScript knows the types of its `props`. Values of JSON fields are
typed `unknown`, because the configuration that arrives decides their shape. See
[useControls](/en/composables/controls) for details.

## Slots

A slot named after a field path sets the content of the component: the radios of a group or
the label of a checkbox. The slot receives `error`, `invalid`, `touched` and `pending`,
and inside a repeated group also `row`.

The `actions` slot replaces the form buttons. It receives `submit`, `reset`, `pending`, `dirty`
and the step data.

## API

<ApiReference name="NuiSmartForm" />
