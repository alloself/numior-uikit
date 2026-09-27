# Form

`@numior/forms` builds forms from the kit controls. `useForm` holds the values, errors and
submission, `NuiForm` renders a `<form>` with errors and a button, `NuiFormField` binds a
control. Validation comes from a Zod, Valibot or ArkType schema, or from the package rules.

<Example name="form/Schema" />

## Installation

```ts
import { NuiForm, NuiFormField, useForm } from '@numior/forms';
import '@numior/forms/styles/form.css';
```

## Examples

### Rules without a schema

The `rules` of a field are a list of package rules: `required`, `min`, `max`, `email`,
`pattern`, `custom`. A server error is thrown as `NuiFormError` and lives until the field
value changes.

<Example name="form/Rules" />

### Async validation

`customAsync` runs after the sync rules: after a change through `debounce`, on submit with the
answer awaited. While the check runs, the field slot receives `pending`.

<Example name="form/Async" />

### Repeated groups

`NuiFieldArray` renders row cards: `min` hides removal, `max` disables adding, `reorderable`
adds reordering with the mouse and the keyboard.

<Example name="form/Guests" />

## Validation

`schema` takes any Standard Schema v1 schema. A schema issue lands in the field on its path, an
issue without a path in the form error block. The schema output without a single issue reaches
`onSubmit` as `output`.

Form rules go into `useForm({ rules })` by path or by a pattern with `*` for the row index,
field rules into `rules` of `NuiFormField`.

By default the form stays silent until the first submit, after which every change re-checks the
field. `validateOn="blur"` or `"change"` on the form or the field starts validation earlier. A
rule that needs neighbouring values reads them from the context: `custom((value, { values }) => …)`.

## Submission

`NuiForm` renders `<form novalidate>`: Enter in a field and the button submit the form, the
browser shows no hints of its own. `onSubmit(values, helpers)` receives the values without
hidden fields plus `output`, `signal`, `setErrors`, `setFormErrors` and `resetForm`. While the
handler runs the form is `aria-busy`, the button keeps its focus and width, a second submit is
ignored.

After a failed submit the focus moves to the first invalid field. `form.submit()` returns
`{ status, invalid, formErrors }`; a `type="reset"` button and `resetForm()` reset the form.

## Hidden and disabled fields

A field that is not rendered leaves validation and submission but keeps its value;
`keepValue="false"` clears it when hidden. A disabled field submits but is not validated.
Control drafts, such as a number, a time or combobox text, are committed by `NuiFormField`
before the submit.

## Storage

The values and field state live in the package engine. An app on vee-validate plugs its storage
in from the separate entry `@numior/forms/vee-validate` through `useForm({ engine })`.
Validation, submission and focus stay with `@numior/forms`; a custom engine implements
`FormEngineFactory`.

## Accessibility

Errors are linked to the control through `aria-describedby` and `aria-invalid`; the form error
block is a `role="alert"` recreated on every attempt. In groups adding, removing and reordering
are announced in a live region, and the focus moves into the new row.

## API

<ApiReference :names="['NuiForm', 'NuiFormField', 'NuiFieldArray']" />
