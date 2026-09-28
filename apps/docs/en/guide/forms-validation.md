# Forms validation

`@numior/forms` validates values in two ways: with a Standard Schema (zod, valibot, arktype)
or with rules by path. Both live in `useForm`, errors reach the fields through
`NuiFormField`, and the form stays silent until the first submit. The components are described
on the [Form](/en/components/form) and [Smart form](/en/components/smart-form) pages.

<Example name="form/Schema" />

## Schema

`useForm({ schema })` takes any Standard Schema v1 without adapters. An issue with a path lands
in its field, an issue without a path in the form error block. A schema output without a
single issue reaches `onSubmit` as `output` typed by the schema.

## Rules

Rules suit forms without a schema or checks that depend on sibling values. Built in:
`required`, `email`, `min`, `max`, `pattern`, `custom`; each takes `{ message }` for an own
text, the default texts come from the `formRules` dictionary.

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

Form rules are set by path or by a pattern with `*` in place of a row index
(`'guests.*.email'`), field rules in `rules` of `NuiFormField`.

## Async validation

`customAsync` receives the value and a `signal`: while the user types, the previous request
is aborted and the field shows the checking state.

<Example name="form/Async" />

## When to validate

`validateOn` on the form or a field picks the moment. `submit` (the default) stays silent
until the first submit, `blur` validates when the focus leaves, `change` on every change. After the first
submit any change re-validates the field regardless of the mode.

## Server errors

The `onSubmit` handler throws `NuiFormError({ email: 'Address taken' })` or calls `setErrors`
from the helpers. The errors land in the fields, form errors in the `role="alert"` block, and
the focus moves to the first invalid field.

```ts
onSubmit: async (values, { setErrors }) => {
  const response = await api.register(values);

  if (response.status === 422) {
    setErrors(response.errors);
  }
};
```

## vee-validate

An app on vee-validate plugs its store in through `useForm({ engine: veeValidateEngine })`
from `@numior/forms/vee-validate`; validation, submit and focus stay with `@numior/forms`.
It needs vee-validate 5: the adapter is tested on `5.0.0-beta.1`, the peer range is
`>=5.0.0-beta.1 <6.0.0`.
