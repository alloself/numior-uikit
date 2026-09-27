# useForm

`useForm(options)` creates an `@numior/forms` form: the values, a schema or rules, the
validation moment and the submit handler. `useField` and `useFieldArray` connect controls and
repeatable groups to it without `NuiFormField`; `useFormContext` reads the form from
`provideForm`.

<Example name="form/Guests" />

## Signature

<SignatureReference :names="['useForm', 'UseFormOptions', 'FormContext', 'useField', 'UseFieldOptions', 'FormField', 'useFieldArray', 'UseFieldArrayOptions', 'FieldArray', 'useFormContext']" />

## Usage

```ts
import { useField, useForm, required } from '@numior/forms';

const form = useForm({
  initialValues: { email: '' },
  rules: { email: [required()] },
  onSubmit: (values) => api.subscribe(values),
});

const email = useField((v) => v.email, { form });
```

`email.binding` holds `modelValue`, `onUpdate:modelValue` and `onBlur` for `v-bind`,
`email.errorMessage` the first error, `email.meta` the `touched` and `dirty` flags. The
components and the validation are described on the [Form](/en/components/form) and
[Forms validation](/en/guide/forms-validation) pages.
