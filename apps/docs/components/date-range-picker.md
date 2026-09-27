# Date range picker

`NuiDateRangePicker` держит два поля даты в одной рамке и открывает
[Calendar](/components/calendar) в режиме `range` на два месяца с пресетами. Модель —
`{ start, end }` со строками `YYYY-MM-DD` или `null`.

<Example name="date-range-picker/Basic" />

## Установка

```ts
import { NuiDateRangePicker } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/calendar.css';
import '@numior/vue/styles/date-picker.css';
```

## Поведение

Каждое поле разбирается как в [Date picker](/components/date-picker); конец раньше начала
меняет их местами. В календаре первый клик открывает диапазон, второй закрывает его и диалог,
пресет делает то же одним нажатием. Кнопка очистки сбрасывает оба конца, `startName` и
`endName` добавляют скрытые поля для формы.

## Доступность

Подпись поля стоит на поле начала, поле конца называется `endLabel`; описание и ошибка связаны
с обоими через `aria-describedby`.

<KeyboardReference name="NuiDateRangePicker" />

## API

<ApiReference name="NuiDateRangePicker" />
