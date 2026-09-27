# Number field

`NuiNumberField` хранит `number | null` и показывает число в формате локали: разделители,
валюту, проценты. Пока поле в фокусе, текст остаётся таким, каким его ввёл пользователь.

<Example name="number-field/Basic" />

## Установка

```ts
import { NuiNumberField } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/number-field.css';
```

## Использование

<Configurator name="NuiNumberField" />

## Примеры

### Границы и шаг

По уходу фокуса или Enter значение разбирается, зажимается в `min` и `max` и снапится к сетке
шага. `steppers="false"` убирает кнопки плюс и минус.

<Example name="number-field/Bounds" />

### Локаль

Локаль приходит из конфигурации приложения, `locale` меняет её для одного поля. При разборе
принимаются локальные и ASCII-цифры, разделитель дробной части локали и минус в любой форме.

<Example name="number-field/Locale" />

## Доступность

Единственный доступный элемент — `<input role="spinbutton" inputmode="decimal">` с
`aria-valuenow`, `aria-valuemin`, `aria-valuemax` и `aria-valuetext` в формате локали.
Степперы скрыты от вспомогательных технологий и не забирают фокус. На iOS клавиатура
`decimal` не показывает минус: для отрицательных значений передайте `inputmode="text"`.

<KeyboardReference name="NuiNumberField" />

## API

<ApiReference name="NuiNumberField" />
