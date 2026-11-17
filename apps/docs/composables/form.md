# useForm

`useForm(options)` создаёт форму `@numior/kit/forms`: начальные значения, схему или правила
проверки и обработчик отправки. Используйте его вместе с `NuiForm` или со своей разметкой.

`useField` подключает к форме одно поле, а `useFieldArray` — список повторяющихся групп полей,
оба без `NuiFormField`. `useFormContext` возвращает форму, переданную через `provideForm`.

<Example name="form/Lines" />

## Сигнатура

<SignatureReference :names="['useForm', 'UseFormOptions', 'FormContext', 'useField', 'UseFieldOptions', 'FormField', 'useFieldArray', 'UseFieldArrayOptions', 'FieldArray', 'useFormContext']" />

## Использование

```ts
import { required, useField, useForm } from '@numior/kit/forms';

const form = useForm({
  initialValues: { email: '' },
  rules: { email: [required()] },
  onSubmit: (values) => api.subscribe(values),
});

const email = useField((v) => v.email, { form });
```

`email.binding` содержит `modelValue`, `onUpdate:modelValue` и `onBlur`: передайте его
контролу через `v-bind`. `email.errorMessage` — первая ошибка поля. `email.meta.touched` равен
`true`, если поле теряло фокус, `email.meta.dirty` — если значение изменилось.

Компоненты форм и проверка описаны на страницах [Form](/components/form) и
[Валидация форм](/guide/forms-validation).
