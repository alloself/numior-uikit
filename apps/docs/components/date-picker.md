# Date picker

`NuiDatePicker` — поле с текстовым вводом даты и кнопкой, открывающей
[Calendar](/components/calendar) в немодальном диалоге. Модель — строка `YYYY-MM-DD`, текст в
поле следует формату локали, а ISO принимается всегда.

<Example name="date-picker/Basic" />

## Установка

```ts
import { NuiDatePicker } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/calendar.css';
import '@numior/vue/styles/date-picker.css';
```

## Примеры

### Дата и время

`time` добавляет под календарём [Time field](/components/time-field): выбор дня не закрывает
диалог, модель становится `YYYY-MM-DDTHH:mm`.

<Example name="date-picker/Time" />

## Поведение

Текст разбирается по мере ввода: полная дата сразу попадает в модель, частичный ввод модель не
трогает, невалидный текст откатывается при потере фокуса. Выбор дня записывает модель,
закрывает диалог и возвращает фокус в поле. `name` добавляет скрытый input с ISO-значением.

<KeyboardReference name="NuiDatePicker" />

## API

<ApiReference name="NuiDatePicker" />
