# useForm

`useForm(options)` creates an `@numior/forms` form: the initial values, a schema or validation
rules and the submit handler. Use it with `NuiForm` or with your own markup.

`useField` connects a single field to the form, and `useFieldArray` a list of repeated field
groups, both without `NuiFormField`. `useFormContext` returns the form passed with
`provideForm`.

<Example name="form/Lines" />

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

`email.binding` holds `modelValue`, `onUpdate:modelValue` and `onBlur`: pass it to the control
with `v-bind`. `email.errorMessage` is the first error of the field. `email.meta.touched` is
`true` once the field has lost focus, and `email.meta.dirty` once the value has changed.

Form components and validation are described on the [Form](/en/components/form) and
[Forms validation](/en/guide/forms-validation) pages.
