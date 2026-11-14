# Date range picker

Поле для периода из двух дат.

<Example name="date-range-picker/Basic" />

Период хранится объектом `{ start, end }`.

## Установка

```ts
import { NuiDateRangePicker } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/calendar.css';
import '@numior/vue/styles/date-picker.css';
```

## Использование

Выберите период и поменяйте число месяцев в календаре, размер и состояния поля.

<Configurator name="NuiDateRangePicker" />

## Поведение

- Обе даты вводятся так же, как в [Date picker](/components/date-picker).
- Если конец раньше начала, поле меняет даты местами, когда фокус уходит из даты или нажат Enter.
- В календаре первый клик выбирает начало, второй — конец и закрывает календарь. Готовый период
  из `presets` выбирается одним кликом.
- Кнопка очистки из `clearable` сбрасывает обе даты.

## Доступность

Подпись из `label` относится к дате начала. Поле конца экранный диктор называет «Дата окончания»,
текст меняет свойство `endLabel`. Описание и ошибка зачитываются для обеих дат.

<KeyboardReference name="NuiDateRangePicker" />

## API

<ApiReference name="NuiDateRangePicker" />
