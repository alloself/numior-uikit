# Number field

Поле для чисел с форматом языка, валютой и шагом.

<Example name="number-field/Basic" />

Опишите формат в `formatOptions`, как для `Intl.NumberFormat`. Подпись, подсказка и ошибка
работают как у [Field](/components/field).

## Установка

```ts
import { NuiNumberField } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/number-field.css';
```

## Использование

Поменяйте границы, шаг и кнопки поля.

<Configurator name="NuiNumberField" />

## Примеры

### Ограничить диапазон

Задайте `min`, `max` и `step`.

<Example name="number-field/Bounds" />

Число вне диапазона вернётся в него, когда поле потеряет фокус или пользователь нажмёт Enter.
Значение, которое в поле не правили, остаётся в модели как было.

### Показать число в другом формате

Передайте `locale` полю.

<Example name="number-field/Locale" />

Без `locale` поле берёт язык приложения. При вводе подходят цифры и десятичный разделитель этого
языка, обычные цифры и минус в любом написании.

## Доступность

У поля роль `spinbutton`: экранный диктор называет значение, минимум и максимум в формате языка.
Кнопки «плюс» и «минус» скрыты от диктора и не получают фокус: с клавиатуры их заменяют стрелки.

На iOS цифровая клавиатура не показывает минус: для отрицательных чисел передайте
`inputmode="text"`.

<KeyboardReference name="NuiNumberField" />

## API

<ApiReference name="NuiNumberField" />
