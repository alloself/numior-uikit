# Form

A form that checks the values and submits them.

<Example name="form/Schema" />

- `useForm` creates the form: the initial values, the validation and the submit handler.
- `NuiForm` renders it with a submit button and a block for errors of the whole form.
- `NuiFormField` connects one control and shows its label, hint and error.

The checks come from a Zod, Valibot or ArkType schema or from the rules of the package.

## Installation

```ts
import { NuiFieldArray, NuiForm, NuiFormField, useForm } from '@numior/forms';
import '@numior/forms/styles/form.css';
import '@numior/forms/styles/field-array.css';
```

## Examples

### Validate without a schema

Pass `rules` to a field.

<Example name="form/Rules" />

The package rules are `required`, `min`, `max`, `email`, `pattern` and `custom`. `min` and `max`
measure the length of text, the value of a number or the count of list items. `min`, `max`,
`email` and `pattern` let an empty value pass, so add `required` to a field that must be filled.

Throw `NuiFormError` from `onSubmit` with messages by field path, and each message shows under
its field. It stays there until the value changes or the form is submitted again. A message for
the empty path or the second argument of `NuiFormError` goes to the error block above the fields.

### Check a value on the server

Add the `customAsync` rule.

<Example name="form/Async" />

The rule runs only when the field has no other error. While the field validates on change, the
check starts 300 ms after the last edit, and `debounce` changes the delay. A check on blur or on
submit starts at once, and the submit waits for the answer.

Until the answer arrives, the field slot gets `pending`, so you can show that the check is
running. The rule also gets a `signal` that aborts when a newer check starts: pass it to `fetch`.

### Repeat a group of fields

Render the rows in `NuiFieldArray`.

<Example name="form/Lines" />

When only `min` rows are left, the remove buttons disappear. At `max` the add button is disabled
and a note about the limit appears. With `reorderable`, the rows move by their grips with the
mouse or the keyboard.

A screen reader treats each row as a group named "Row 2", and `rowLabel` sets your own name, such
as "Item 2". A schema error with the path of a row, such as `lines.1`, shows under the row and is
read on entering it. When such a row holds the first error after a submit, focus moves to its
first field.

## Validation

Pass any Standard Schema v1 schema, such as one from Zod, Valibot or ArkType, to
`useForm({ schema })`. An error with a field path shows under that field, and an error without a
path shows in the block above the fields. When nothing fails, `onSubmit` gets the schema result
as `output`.

Set rules for the whole form in `useForm({ rules })` by field path, such as `'customer.email'`.
Write `*` in place of a row number to apply a rule to every row: `'lines.*.quantity'`. The rules
of a single field go into `rules` of `NuiFormField`.

The form shows no errors until the first submit, and after it each field is checked on every
change. To check earlier, set `validateOn: 'blur'` or `'change'` in `useForm`, or `validate-on`
on one `NuiFormField`. A rule gets the other values in its second argument:
`custom((value, { values }) => …)`.

The [Forms validation](/en/guide/forms-validation) guide covers custom error texts, failed async
checks and server errors.

## Submission

The form submits with its button or with Enter in a field, and the browser shows no validation
hints of its own. `onSubmit(values, helpers)` gets the values without hidden fields, and
`helpers` holds:

- `output`, the schema result;
- `signal`, which aborts when the form is reset during the submit;
- `setErrors` and `setFieldError`, which put errors under fields;
- `setFormErrors`, which puts messages into the error block above the fields;
- `resetForm`, which restores or replaces the initial values.

While `onSubmit` runs, the button shows a loading indicator and keeps its width and focus, and a
second press does nothing. When validation fails, focus moves to the first field with an error.
When only the form has an error, focus moves to the error block.

After a successful submit, the current values become the initial ones, so the form is no longer
dirty. Values that never had a field, such as `id`, are submitted as they are.

To take the server answer as the new initial values, call `helpers.resetForm({ values })` inside
`onSubmit`, and the submit still ends with `submitted`. A `type="reset"` button and
`form.resetForm()` restore the initial values and clear the errors.

`form.submit()` submits the form from code and returns `{ status, invalid, formErrors }`.
`invalid` lists the paths of fields with errors, and `formErrors` the messages of the error block.
The status says how the submit ended:

| Status      | When                                                       |
| ----------- | ---------------------------------------------------------- |
| `submitted` | `onSubmit` finished and left no errors                     |
| `invalid`   | Validation failed, and `onSubmit` did not run              |
| `rejected`  | `onSubmit` threw `NuiFormError` or set errors              |
| `ignored`   | Another submit was still running                           |
| `aborted`   | The form was reset during the submit, and `signal` aborted |

## Hidden and disabled fields

A field that is not on the page is neither validated nor submitted, but its value stays and comes
back with the field. The schema gets the submitted values too, and its errors about hidden fields
are dropped. Set `:keep-value="false"` to clear the value as soon as the field is hidden; the
value type must allow `undefined`.

A disabled field is submitted without validation. A field or a form with `readonly` shows the
value, which the user can select and copy but not change. Such a field is submitted without
validation too, and the submit button of a read-only form is disabled.

Before the submit, `NuiFormField` commits unfinished input, such as a typed number, a time or
combobox text. The form gets what the user sees.

## Storage

The package keeps the values itself unless you pass a `FormEngineFactory` to
`useForm({ engine })`, for example to keep them in Pinia. The engine holds the values, the state
of each field and the row keys of repeated groups. Validation, submission and focus work the same
on any engine.

## Accessibility

A screen reader reads the label, the hint and the error together with the field and reports an
invalid value. The error block above the fields is announced at once after every failed submit.

In a repeated group, adding, removing and moving rows are announced too, and focus moves into a
new row. A row moves from the keyboard on its grip:

| Key                | Action                                      |
| ------------------ | ------------------------------------------- |
| Space or Enter     | Grab the row, then drop it at the new place |
| Up and Down arrows | Move the grabbed row                        |
| Escape             | Cancel the move                             |

Moving focus off the grip cancels the move as well.

## API

<ApiReference :names="['NuiForm', 'NuiFormField', 'NuiFieldArray']" />
