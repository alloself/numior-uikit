# Calendar

`NuiCalendar` показывает один или несколько месяцев сеткой `role="grid"` и работает со
строками: дата `YYYY-MM-DD`, набор дат или диапазон `{ start, end }`. Режим задаёт `mode`,
значение живёт в одном `v-model`, подписи и начало недели берутся из локали.

<Example name="calendar/Basic" />

## Установка

```ts
import { NuiCalendar } from '@numior/vue';
import '@numior/vue/styles/calendar.css';
```

## Примеры

### Несколько дат

`mode="multiple"` переключает дни кликом; `size="sm"` для компактных панелей.

<Example name="calendar/Multiple" />

### Диапазон с пресетами

В `range` первый клик открывает диапазон, второй закрывает его, протягивание выбирает оба конца
сразу. `presets` показывают готовые диапазоны и подсвечивают совпадающий.

<Example name="calendar/Range" />

## Поведение

Даты вне `min` и `max` и отклонённые `isDateDisabled` остаются доступными для фокуса, но не
выбираются. Заголовок месяца и года открывает сетки месяцев и лет. Сегодняшняя дата приходит из
`today`, а без него — из часов только после монтирования, поэтому серверная разметка не зависит
от часового пояса сервера.

## Доступность

Каждый месяц — `section` с подписью, сетка — `table role="grid"`. Дни — кнопки внутри
`gridcell` с полной датой в `aria-label`; ячейки несут `aria-selected`, сегодняшний день —
`aria-current="date"`. Один tab stop детерминирован уже на сервере.

<KeyboardReference name="NuiCalendar" />

## API

<ApiReference name="NuiCalendar" />
