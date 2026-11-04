# Form

The `@numior/forms` package builds a form from Numior UI inputs: it stores the values, validates them
and submits them. `useForm` creates the form, `NuiForm` renders it with a submit button, and each
control connects through `NuiFormField`.

<Example name="form/Schema" />

Validation rules come from a Zod, Valibot or ArkType schema, as in the example, or from the rules
of the package itself.

## Installation

```ts
import { NuiForm, NuiFormField, useForm } from '@numior/forms';
import '@numior/forms/styles/form.css';
```

## Examples

### Rules without a schema

Pass `rules` to a field: a list of package rules such as `required`, `min`, `max`, `email`,
`pattern` or `custom`. Throw a server error, such as "This address is already registered", from
`onSubmit` as `NuiFormError`. It stays under the field until the user changes the value.

<Example name="form/Rules" />

### Async validation

The `customAsync` rule checks a value on the server, for example whether a login is free. It runs
after the regular rules: while typing, 300 ms after the last change; on submit, at once, and the
form waits for the answer. Until the answer arrives, the field slot receives `pending`.

<Example name="form/Async" />

### Repeated groups

`NuiFieldArray` renders a list of identical cards, such as guests. When only `min` cards are left,
the remove button disappears, and at `max` the add button is disabled. `reorderable` lets users
reorder the cards with the mouse and the keyboard.

<Example name="form/Guests" />

## Validation

The `schema` prop takes any Standard Schema v1 schema. A schema error with a path shows under its
field, an error without a path shows in the block above the form fields. When there are no
errors, the schema result reaches `onSubmit` as `output`.

Set rules for the whole form in `useForm({ rules })` by field path. Write `*` instead of the row
number of a repeated group to apply a rule to every row. Rules of a single field go into `rules`
of `NuiFormField`.

The form shows no errors until the first submit; after it, a field is validated on every change.
`validateOn="blur"` or `validateOn="change"` on the form or a field starts validation earlier. A
rule receives the values of other fields as its second argument: `custom((value, { values }) => …)`.

## Submission

The form submits with the button or with Enter in a field, and the browser shows no hints of its
own. `onSubmit(values, helpers)` receives the values without hidden fields, and `helpers` holds
`output`, `signal`, `setErrors`, `setFormErrors` and `resetForm`.

While `onSubmit` runs, the button shows a spinner and keeps its width and focus, and a second press
does nothing. When validation fails, the focus moves to the first field with an error.

`form.submit()` submits the form from code and returns `{ status, invalid, formErrors }`. A
`type="reset"` button and a `resetForm()` call restore the initial values.

## Hidden and disabled fields

A field that is not rendered on the page is neither validated nor submitted, but keeps its value.
With `:keep-value="false"` the value is cleared as soon as the field is hidden. A disabled field
is submitted without validation.

Before the submit, `NuiFormField` commits unfinished input such as a number, a time or combobox
text. The form receives what the user sees.

A field or form with `readonly` shows the value, which can be selected and copied but not changed.
Such a field is submitted without validation, and the submit button of a read-only form is
disabled.

## Storage

By default the package stores the values itself. To keep them in your own store, for example in
Pinia, pass a `FormEngineFactory` to `useForm({ engine })`. Validation, submission and focus
handling work the same with any store.

## Accessibility

Screen readers read the error together with the field and report the value as invalid. Form-level
errors are announced right away on every failed submit.

In a repeated group, adding, removing and reordering cards are announced too, and the focus moves
into the new card.

## API

<ApiReference :names="['NuiForm', 'NuiFormField', 'NuiFieldArray']" />
