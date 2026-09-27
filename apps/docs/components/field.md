# Field

`NuiField` связывает контрол с подписью, описанием и ошибкой через общий `id`,
`aria-describedby` и `aria-invalid`. Контролы рисуют свои тексты сами; поле нужно для слотов,
нескольких контролов в одном поле и форм.

<Example name="field/Basic" />

## Установка

```ts
import { NuiField } from '@numior/vue';
import '@numior/vue/styles/field.css';
```

## Примеры

### Слоты

Подпись, описание и ошибка принимают разметку через слоты `label`, `description` и `error`.

<Example name="field/Slots" />

### Группа контролов

`group` превращает поле в `<fieldset>` с `<legend>`; контролы внутри сохраняют собственные
`id`, а `disabled` действует на весь `fieldset`.

<Example name="field/Group" />

### Место под ошибку

`reserveError` держит под контролом пустую строку, поэтому соседние поля и кнопки не
сдвигаются, когда после отправки появляются сообщения. `NuiForm` передаёт его всем полям.

<Example name="field/Reserve" />

## Доступность

Разметка: `<label for>`, контрол с тем же `id`, описание и ошибка с `id` в `aria-describedby`.
Все связи вычисляются на сервере, поэтому SSR и гидратация дают одинаковую разметку. Части
`NuiFieldLabel`, `NuiFieldDescription` и `NuiFieldError` собирают своё поле поверх
`provideField` из `@numior/primitives`.

## API

<ApiReference :names="['NuiField', 'NuiFieldLabel', 'NuiFieldDescription', 'NuiFieldError']" />
