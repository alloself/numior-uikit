# Smart form

`NuiSmartForm` строит форму из конфигурации `formConfig<Values>()`: поля с любыми контролами
кита, секции со своей раскладкой, условные поля, повторяемые группы и шаги. Под капотом те же
`useForm`, `NuiForm`, `NuiFormField` и `NuiFieldArray`, что и в [обычной форме](/components/form).

<Example name="smart-form/Profile" />

## Установка

```ts
import { NuiSmartForm, formConfig, useForm } from '@numior/forms';
import '@numior/forms/styles/form.css';
import '@numior/forms/styles/field-array.css';
import '@numior/forms/styles/smart-form.css';
```

## Примеры

### Шаги

`steps` вместо `fields` делает мастер: шаг проверяется перед переходом, `v-model:step` держит
текущий, последний шаг отправляет форму.

<Example name="smart-form/Wizard" />

### Фильтры в строку

`inline` ставит поля в строку для фильтров над таблицей; на узком контейнере они складываются.

<Example name="smart-form/Inline" />

## Конфигурация

`field(Component, (v) => v.email, options)` описывает поле: контрол, селектор значения и
`label`, `description`, `required`, `rules`, `props` контрола, `when` и `area`. Тип значения
выводится из селектора и сверяется с моделью контрола; `model: 'values'` подключает контрол
с именованной моделью. `section({ title, layout, fields })` рендерит `fieldset`,
`array((v) => v.contacts, { newRow, fields })` — повторяемую группу, поля строки описывает
`formConfig<Row>()`.

## Условия и раскладка

`when(values, row)` показывает поле, секцию или группу, пока возвращает `true`; скрытое поле
выпадает из проверки и отправки, а значение хранит. `layout` пишется в синтаксисе
`grid-template-areas`, имена областей — пути полей или `area`. Уже `36rem` макет складывается
в колонку, поэтому та же форма работает в диалоге и на телефоне.

## Слоты

Слот с путём поля — содержимое контрола: радиокнопки группы, подпись чекбокса. Он получает
`error`, `invalid`, `touched`, `pending` и, в группе, `row`. Слот `actions` заменяет кнопки и
получает `submit`, `reset`, `pending`, `dirty` и шаги.

## API

<ApiReference name="NuiSmartForm" />
