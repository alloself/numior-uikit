# useFieldControl

`useFieldControl(props, options)` подключает свой контрол к полю: отдаёт `attrs` с `id`,
`aria-describedby`, `aria-invalid`, `required` и `disabled`, связанные с подписью, описанием и
ошибкой ближайшего `NuiField`. Без внешнего поля контрол рисует подписи сам через
`NuiFieldFrame`.

<Example name="composables/FieldControl" />

## Сигнатура

<SignatureReference :names="['useFieldControl', 'FieldControlProps', 'FieldControlOptions', 'FieldControl', 'useFieldContext', 'FieldContext', 'useControlId', 'useRadioGroup', 'RadioGroupContext', 'useSplitAttrs', 'SplitAttrs']" />

## Поведение

`props` — геттер с `id`, `invalid`, `required`, `disabled`, `label`, `description` и `error`.
`options.commit` подтверждает черновик перед отправкой формы, `options.group` объявляет
групповой контрол, `options.detached` отключает связь с внешним полем. `useFieldContext`
читает контекст поля напрямую, `useControlId` даёт стабильный id для SSR, `useRadioGroup` —
контекст группы радиокнопок, `useSplitAttrs` делит `$attrs` на атрибуты корня и контрола.
