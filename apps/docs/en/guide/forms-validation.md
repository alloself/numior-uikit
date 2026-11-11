# Forms validation

How to validate form values with a schema or rules and show errors from the server.

<Example name="form/Schema" />

A form from `@numior/forms` validates values with a Standard Schema (zod, valibot, arktype),
with field rules or with both at once. The form shows no errors until the first submit. Form
components are described on the [Form](/en/components/form) and
[Smart form](/en/components/smart-form) pages.

## Schema

Pass the schema to `useForm({ schema })`. Any Standard Schema v1 works without an adapter.

An error with a path shows next to its field, an error without a path in the form error block.
When there are no errors, `onSubmit` receives the schema result in `output`, already typed by
the schema.

## Rules

Use rules when there is no schema or a check depends on other fields. The built-in rules are
`required`, `email`, `min`, `max`, `pattern` and `custom`.

<Example name="form/Rules" />

```ts
const form = useForm({
  initialValues: { password: '', confirm: '' },
  rules: {
    password: [required(), min(8)],
    confirm: [custom((value, { values }) => value === values.password || 'Passwords differ')],
  },
});
```

To replace an error text, pass `{ message }` to the rule. The default texts live in the
`formRules` dictionary.

Form rules are set by field path. For list rows, write `*` in place of the index:
`'guests.*.email'`. You can also pass the rules of one field to the `rules` prop of
`NuiFormField`.

To check a value without a form, call `runRules(rules, value, context)`. It returns the text of
the first error or `undefined`. The table checks a cell edit with the same rules this way.

## Async validation

For a check on the server, use `customAsync`: the function receives the value and a `signal`.
While the user types, the previous request is aborted and the field shows that a check is
running.

When a check throws, the field counts as unchecked and shows "Could not check this value".
The submission is blocked, and the next submission or leaving the field sends the request again.
The error itself goes to `onCheckError(error, path)` in the `useForm` options.

A check reads other fields through `values`. When such a field changes while the request runs, the
answer is dropped and the request is sent again. `form.validate({ silent: true })` waits for the
async checks as well, but shows no errors.

<Example name="form/Async" />

## When to validate

The `validateOn` prop on the form or a field sets when the value is checked:

- `submit` — when the form is submitted, the default;
- `blur` — when the field loses focus;
- `change` — on every change.

After the first submit a field is checked again on every change, whatever the mode.

## Server errors

To show errors from the server, throw `NuiFormError({ email: 'Address taken' })` in `onSubmit`
or call `setErrors`:

```ts
onSubmit: async (values, { setErrors }) => {
  const response = await api.register(values);

  if (response.status === 422) {
    setErrors(response.errors);
  }
};
```

Field errors show next to the fields, form errors in the block with `role="alert"`. Focus moves
to the first field with an error.
