# Валидация форм

`@numior/forms` проверяет значения двумя способами: схемой Standard Schema (zod, valibot,
arktype) или правилами по путям. Оба живут в `useForm`, ошибки попадают в поля через
`NuiFormField`, а форма молчит до первой отправки. Компоненты описаны на страницах
[Form](/components/form) и [Smart form](/components/smart-form).

<Example name="form/Schema" />

## Схема

`useForm({ schema })` принимает любую схему Standard Schema v1 без адаптеров. Issue с путём
попадает в своё поле, issue без пути — в блок ошибок формы. Вывод схемы без единого issue
приходит в `onSubmit` как `output` с типом схемы.

## Правила

Правила подходят, когда схемы нет или проверка зависит от соседних значений. Встроенные:
`required`, `email`, `min`, `max`, `pattern`, `custom`; каждое принимает `{ message }` для
своего текста, тексты по умолчанию берутся из словаря `formRules`.

<Example name="form/Rules" />

```ts
const form = useForm({
  initialValues: { password: '', confirm: '' },
  rules: {
    password: [required(), min(8)],
    confirm: [custom((value, { values }) => value === values.password || 'Пароли не совпадают')],
  },
});
```

Правила формы задаются по пути или по шаблону с `*` вместо индекса строки
(`'guests.*.email'`), правила поля — в `rules` у `NuiFormField`.

## Асинхронная проверка

`customAsync` получает значение и `signal`: пока пользователь печатает, предыдущий запрос
отменяется, а поле показывает состояние проверки.

<Example name="form/Async" />

## Когда проверять

`validateOn` на форме или на поле: `submit` (по умолчанию) молчит до первой отправки, `blur`
проверяет при уходе фокуса, `change` — на каждое изменение. После первой отправки любое
изменение перепроверяет поле независимо от режима.

## Ошибки сервера

Обработчик `onSubmit` бросает `NuiFormError({ email: 'Адрес занят' })` или вызывает
`setErrors` из helpers. Ошибки встают в поля, ошибки формы — в блок `role="alert"`, фокус
переходит в первое невалидное поле.

```ts
onSubmit: async (values, { setErrors }) => {
  const response = await api.register(values);

  if (response.status === 422) {
    setErrors(response.errors);
  }
};
```

## vee-validate

Приложение на vee-validate подключает его хранилище через `useForm({ engine: veeValidateEngine })`
из `@numior/forms/vee-validate`; проверки, отправка и фокус остаются за `@numior/forms`.
Нужна vee-validate 5: адаптер проверен на `5.0.0-beta.1`, peer-диапазон `>=5.0.0-beta.1 <6.0.0`.
