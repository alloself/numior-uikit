# useForm

`useForm(options)` создаёт форму `@numior/forms`: значения, схему или правила, момент
проверки и обработчик отправки. `useField` и `useFieldArray` подключают к ней контролы и
повторяемые группы без `NuiFormField`; `useFormContext` читает форму из `provideForm`.

<Example name="form/Guests" />

## Сигнатура

<SignatureReference :names="['useForm', 'UseFormOptions', 'FormContext', 'useField', 'UseFieldOptions', 'FormField', 'useFieldArray', 'UseFieldArrayOptions', 'FieldArray', 'useFormContext']" />

## Использование

```ts
import { useField, useForm, required } from '@numior/forms';

const form = useForm({
  initialValues: { email: '' },
  rules: { email: [required()] },
  onSubmit: (values) => api.subscribe(values),
});

const email = useField((v) => v.email, { form });
```

`email.binding` содержит `modelValue`, `onUpdate:modelValue` и `onBlur` для `v-bind`,
`email.errorMessage` — первую ошибку, `email.meta` — `touched` и `dirty`. Компоненты и
проверка описаны на страницах [Form](/components/form) и
[Валидация форм](/guide/forms-validation).
