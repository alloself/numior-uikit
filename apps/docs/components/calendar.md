# Calendar

`NuiCalendar` показывает один или несколько месяцев сеткой `role="grid"` и работает со
строками: дата `YYYY-MM-DD`, набор дат `string[]`, диапазон `{ start, end }`. Режим задаёт
`mode` (`single`, `multiple`, `range`), а значение живёт в одном `v-model`. Начало недели,
подписи дней и месяцев, цифры и формат дат берутся из локали через `Intl`; локаль приходит
из `createNuiConfig({ locale })`, `provideNuiConfig` или пропа `locale`.

<script setup>
import { ref } from 'vue'
const date = ref('2026-09-24')
const dates = ref(['2026-09-03', '2026-09-10'])
const range = ref({ start: null, end: null })
const presets = [
  { label: 'Сегодня', range: (today) => ({ start: today, end: today }) },
  { label: 'Неделя', range: { start: '2026-09-21', end: '2026-09-27' } },
]
const weekend = (value) => ['6', '0'].includes(String(new Date(`${value}T00:00:00Z`).getUTCDay()))
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiCalendar locale="ru-RU" v-model="date" today="2026-09-24" week-numbers min="2026-09-02" :is-date-disabled="weekend" />
  <NuiCalendar locale="ru-RU" v-model="dates" mode="multiple" size="sm" today="2026-09-24" />
  <NuiCalendar locale="ru-RU" v-model="range" mode="range" :months="2" :presets="presets" today="2026-09-24" />
</div>

```vue
<NuiCalendar v-model="date" week-numbers :min="today" :is-date-disabled="isHoliday" />
<NuiCalendar v-model="range" mode="range" :months="2" :presets="presets" />
```

## Поведение

Клик по дню выбирает его; в `multiple` — переключает, в `range` первый клик открывает
диапазон, второй закрывает его (концы при необходимости меняются местами), при наведении
показывается превью, а протягивание мышью от дня к дню выбирает оба конца сразу. Пресеты
(`presets`) появляются только в `range` и подсвечиваются `aria-pressed`, когда значение
совпадает. Кнопка «Сегодня» выбирает сегодняшний день в `single` и лишь переводит вид в
остальных режимах. Заголовок месяца и года открывает сетки месяцев и лет; Escape
возвращает к дням. Даты вне `min`/`max` и отклонённые `isDateDisabled` остаются
доступными для фокуса, но не выбираются. Внешние изменения `v-model` двигают tab stop и
показанный месяц, не забирая фокус.

Сегодняшняя дата приходит из пропа `today`, а без него — из локальных часов только после
монтирования, поэтому серверная разметка не зависит от часового пояса сервера. Месяц
управляется `v-model:month` (`YYYY-MM`).

## Клавиатура

Стрелки двигают фокус по дням, Home/End — к началу и концу недели, PageUp/PageDown — на
месяц, с Shift — на год; при выходе за показанные месяцы вид сдвигается. Enter и Space
выбирают. В сетках месяцев и лет стрелки ходят по ячейкам, PageUp/PageDown листают год или
двенадцать лет, Escape закрывает сетку. В RTL горизонтальные стрелки меняются местами.

## Доступность

Каждый месяц — `section` с подписью из заголовка, сетка — `table role="grid"`, дни —
`button` внутри `gridcell` с полной датой в `aria-label`, `aria-selected` на ячейках,
`aria-disabled` на закрытых днях и `aria-current="date"` на сегодняшнем. Один tab stop
детерминирован уже на сервере.

## API

| Prop              | Тип                                          | По умолчанию                            | Описание                                             |
| ----------------- | -------------------------------------------- | --------------------------------------- | ---------------------------------------------------- |
| `v-model`         | `string \| string[] \| NuiDateRange \| null` | `null`                                  | Значение по `mode`                                   |
| `v-model:month`   | `string`                                     | месяц значения                          | Показанный месяц `YYYY-MM`                           |
| `mode`            | `'single' \| 'multiple' \| 'range'`          | `'single'`                              | Режим выбора                                         |
| `locale`          | `string`                                     | из конфига                              | Локаль подписей и формата                            |
| `weekStart`       | `1…7`                                        | из локали                               | Первый день недели (ISO)                             |
| `min` / `max`     | `string`                                     | —                                       | Границы выбора                                       |
| `isDateDisabled`  | `(date: string) => boolean`                  | —                                       | Закрытые даты                                        |
| `months`          | `number`                                     | `1`                                     | Сколько месяцев показать                             |
| `weekNumbers`     | `boolean`                                    | `false`                                 | Колонка номеров недель ISO                           |
| `fixedWeeks`      | `boolean`                                    | `true`                                  | Всегда шесть строк                                   |
| `showOutsideDays` | `boolean`                                    | `true`                                  | Дни соседних месяцев                                 |
| `showToday`       | `boolean`                                    | `true`                                  | Кнопка «Сегодня»                                     |
| `today`           | `string`                                     | локальная дата                          | Сегодняшний день `YYYY-MM-DD`                        |
| `presets`         | `NuiDatePreset[]`                            | —                                       | Пресеты диапазонов                                   |
| `size`            | `'sm' \| 'md' \| 'lg'`                       | `'md'`                                  | Размер ячеек                                         |
| `disabled`        | `boolean`                                    | `false`                                 | Весь календарь неактивен                             |
| `*Label`          | `string`                                     | [словарь](/guide/localization#calendar) | `previous`, `next`, `month`, `year`, `today`, `week` |

Слот `actions` в подвале. Метод `focus(date?)` через ref. Блок `nui-calendar`
(модификаторы `--size-*`, `--mode-*`, `--view-*`, `--week-numbers`, `--multi`, `--picking`,
`--presets`, `--disabled`; элементы `__months`, `__month`, `__caption`, `__nav`, `__title`,
`__title-button`, `__grid`, `__weekday`, `__week`, `__row`, `__cell` с `--range-start`,
`--range-end`, `--range-middle`, `--preview`, `__day` с `--selected`, `--today`, `--outside`,
`--disabled`, `__picker`, `__option`, `__presets`, `__preset`, `__footer`, `__today`,
`__actions`; переменные `--_cell`, `--_radius`, `--_selected-bg`, `--_selected-fg`,
`--_range-bg`, `--_range-fg`).
