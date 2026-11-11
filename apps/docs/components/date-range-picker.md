# Date range picker

`NuiDateRangePicker` — поле для периода: даты начала и конца стоят рядом в одной рамке, а
календарь показывает сразу два месяца. Модель — объект `{ start, end }`, где каждая
дата — строка `YYYY-MM-DD` или `null`.

<Example name="date-range-picker/Basic" />

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

Обе даты вводятся так же, как в [Date picker](/components/date-picker). Если конец раньше начала,
поле меняет их местами. С `openOnClick` календарь открывается щелчком по любой из дат.

В календаре первый щелчок выбирает начало, второй — конец и закрывает календарь. Готовый период
из `presets`, например «Последние 7 дней», выбирается одним щелчком. Дата раньше `min` или позже
`max` в модель не попадает.

Кнопка очистки из `clearable` сбрасывает обе даты. Передайте `startName` и `endName`, чтобы форма
отправила начало и конец отдельными полями.

## Доступность

Подпись из `label` относится к дате начала. Поле конца экранный диктор называет «Дата окончания»,
текст меняет свойство `endLabel`. Описание и ошибка зачитываются для обеих дат.

<KeyboardReference name="NuiDateRangePicker" />

## API

<ApiReference name="NuiDateRangePicker" />
