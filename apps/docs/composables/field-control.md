# useFieldControl

`useFieldControl(props, options)` связывает ваш контрол с подписью, подсказкой и ошибкой поля.
Используйте его, когда пишете свой контрол для `NuiField` и форм.

Композабл возвращает `attrs` с `id`, `aria-describedby`, `aria-invalid`, `required` и `disabled`.
Повесьте их на элемент ввода. Оберните разметку контрола в `NuiFieldFrame`: вне `NuiField` он сам
выведет подпись, подсказку и ошибку.

<Example name="composables/FieldControl" />

## Сигнатура

<SignatureReference :names="['useFieldControl', 'FieldControlProps', 'FieldControlOptions', 'FieldControl', 'useFieldContext', 'FieldContext', 'useControlId', 'useRadioGroup', 'RadioGroupContext', 'useSplitAttrs', 'SplitAttrs']" />

## Поведение

`props` — геттер, который возвращает `id`, `invalid`, `required`, `disabled`, `label`,
`description` и `error` контрола. Опции:

- `commit` — функция, которая сохраняет недописанное значение перед отправкой формы, например
  дату, набранную не до конца;
- `group` — контрол состоит из нескольких элементов, как группа радиокнопок;
- `detached` — контрол не связывается с внешним `NuiField`.

Вспомогательные функции:

- `useFieldContext()` возвращает поле, внутри которого стоит контрол;
- `useControlId()` даёт id, который совпадает на сервере и в браузере;
- `useRadioGroup()` возвращает группу, в которой стоит радиокнопка;
- `useSplitAttrs()` делит `$attrs` на атрибуты корневого элемента и элемента ввода.
