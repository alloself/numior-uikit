# Smart form

A form built from a description of its fields.

<Example name="smart-form/Customer" />

Use it for routine forms, such as a customer card, settings or filters, and for forms that come
from the server as JSON. `formConfig<Values>()` describes the fields, and the same `useForm` as
in the [plain form](/en/components/form) validates and submits them.

## Installation

```ts
import { NuiSmartForm, formConfig, useForm } from '@numior/forms';
import '@numior/forms/styles/form.css';
import '@numior/forms/styles/field-array.css';
import '@numior/forms/styles/smart-form.css';
```

## Examples

### Split the form into steps

Pass `steps` instead of `fields`.

<Example name="smart-form/Wizard" />

The Next button checks the fields of the open step and moves on only when they pass. The stepper
goes back to finished steps, and `v-model:step` holds the open step.

The button on the last step submits the whole form, and when a field on another step fails, that
step opens. A screen reader announces each new step, such as "Step 2 of 3: Delivery".

### Line up filters in a row

Set `inline="fit"`.

<Example name="smart-form/Inline" />

The fields take the width of their content and wrap to the next line when the row runs out of
room. Set `inline="grow"` to stretch them to the full width.

## Configuration

`field(Component, (v) => v.email, options)` describes a field: the component, a function that
picks the value from the form values, and the options. The options repeat the props of
`NuiFormField`, such as `label`, `required` and `rules`, and add `props`, `when`, `area` and
`model`. `props` goes to the component and takes an object or a function of the form values.

TypeScript infers the value type from the picking function and checks it against the component
model. When the component keeps its value in a named model in place of `v-model`, name it:
`model: 'values'`. Set `group: true` for a set of controls, such as radios, and the label becomes
the legend of the group.

`section({ title, layout, fields })` renders a group of fields under one title, with an optional
`description`. `array((v) => v.contacts, { newRow, fields })` renders a repeatable group with the
`min`, `max` and `reorderable` of `NuiFieldArray`. A separate `formConfig<Row>()` describes the
fields of one row.

## Conditions and layout

A field, a section or a group shows while its `when(values)` returns `true`. In a repeatable
group, `when` gets the values of its row and the row itself. A hidden field is neither validated
nor submitted, but its value is kept and comes back with the field.

Set `layout` on the form, a section, a step or the rows of a group. It is written like the CSS
`grid-template-areas` property, such as `'"name email" "company company"'`. An area is named after
the field path with dots replaced by hyphens, such as `address-city`, or after its `area` option.

A section takes its `name` or `area` as the area name, and inside a repeatable group the path
counts from the row. A layout row whose fields are all hidden disappears, so a field that takes a
whole row leaves no gap when hidden.

When the form is narrower than `36rem`, the fields stack in one column, so the same form fits a
dialog and a phone.

## From JSON

`parseFormConfig(json, { controls })` builds the configuration from JSON, with the components
from a control set. Each entry has a `kind` of `field`, `section` or `array`. A field names its
component with a string `type` from the set and its value with a `name` path, such as
`address.city`.

A field also takes `props`, `rules` and a `when` condition. The rules are `required`, `email`,
`min`, `max` and `pattern`, written as objects such as `{ "rule": "min", "limit": 2 }`. A
condition is `{ "path": "kind", "equals": "company" }` or
`{ "path": "delivery", "in": ["courier", "post"] }`.

The component from the set checks its own `props`. An unknown `type`, rejected `props` or an entry
of the wrong shape give a list of `issues` in place of the fields. Each issue has a `code` and a
`path`, such as `fields.2.type`.

A `pattern` rule whose `source` is not a regular expression is reported in `issues` too. The path
leads to the rule itself, such as `fields.0.rules.1`.

`formConfig({ controls }).control('select', (v) => v.country, { props })` takes a component from
the set by key, and TypeScript knows the types of its `props`. Values of JSON fields are typed
`unknown`, because the configuration that arrives decides their shape. The
[useControls](/en/composables/controls) page shows how to build a control set.

## Slots

A slot named after a field path fills the component, such as the radios of a group or the label
of a checkbox. Inside a repeatable group the slot name skips the row number, such as
`contacts.phone`. The slot gets `error`, `invalid`, `touched` and `pending`, and inside a group
also `row`.

A slot named `path:after`, such as `email:after`, adds content under the field and gets `row`
too. The `form-errors` slot replaces the error block above the fields and gets `errors`.

The `actions` slot replaces the form buttons. It gets `submit`, `reset`, `pending` and `dirty`,
and in a wizard also `step`, `first`, `last` and `back`.

## API

<ApiReference name="NuiSmartForm" />
