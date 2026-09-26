# Выбор даты

`NuiDatePicker` — поле с текстовым вводом даты и кнопкой, открывающей
[календарь](/components/calendar) в немодальном диалоге. Модель — строка `YYYY-MM-DD` (с
`time` — `YYYY-MM-DDTHH:mm`), текст в поле следует числовому формату локали
(`24.09.2026`, `09/24/2026`, `2026/09/24`), а ISO принимается всегда.

<script setup>
import { ref } from 'vue'
const trip = ref('2026-09-24')
const meeting = ref('2026-09-24T09:30')
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiField label="Дата поездки" description="Введите или выберите в календаре">
    <NuiDatePicker locale="ru-RU" v-model="trip" clearable today="2026-09-24" />
  </NuiField>
  <NuiField label="Встреча" description="Дата и время">
    <NuiDatePicker locale="ru-RU" v-model="meeting" time :time-step="30" today="2026-09-24" />
  </NuiField>
</div>

```vue
<NuiField label="Дата поездки">
  <NuiDatePicker v-model="trip" clearable :min="today" />
</NuiField>
<NuiField label="Встреча">
  <NuiDatePicker v-model="meeting" time :time-step="30" />
</NuiField>
```

## Поведение

Текст разбирается по мере ввода: полная дата в формате локали или ISO сразу попадает в
модель, частичный ввод модель не трогает, а невалидный текст откатывается к текущему
значению при потере фокуса. Пустое поле даёт `null`. Календарь открывается кнопкой или
ArrowDown в поле, ставит фокус на выбранный день, а выбор дня записывает модель, закрывает
диалог и возвращает фокус в поле. Escape и уход фокуса наружу закрывают диалог.
`clearable` добавляет кнопку очистки, `name` — скрытый input с ISO-значением для формы.

С `time` под календарём появляется [поле времени](/components/time-field): выбор дня не
закрывает диалог, время редактируется сегментами или в тексте после даты (`HH:mm`), Enter
в поле времени закрывает диалог.

## API

| Prop          | Тип                 | По умолчанию                                        | Описание                                            |
| ------------- | ------------------- | --------------------------------------------------- | --------------------------------------------------- |
| `v-model`     | `string \| null`    | `null`                                              | Дата `YYYY-MM-DD` или с `time` — `YYYY-MM-DDTHH:mm` |
| `time`        | `boolean`           | `false`                                             | Дата и время                                        |
| `timeStep`    | `number`            | `15`                                                | Шаг подсказок времени в минутах                     |
| `placeholder` | `string`            | шаблон локали                                       | Подсказка в поле                                    |
| `clearable`   | `boolean`           | `false`                                             | Кнопка очистки                                      |
| `readonly`    | `boolean`           | `false`                                             | Только чтение                                       |
| `name`        | `string`            | —                                                   | Скрытый input для формы                             |
| `placement`   | `FloatingPlacement` | `'bottom-start'`                                    | Сторона диалога                                     |
| `openLabel`   | `string`            | [словарь](/localization#datepicker): «Выбрать дату» | Имя кнопки календаря                                |
| `clearLabel`  | `string`            | [словарь](/localization#datepicker): «Очистить»     | Имя кнопки очистки                                  |
| `dialogLabel` | `string`            | [словарь](/localization#datepicker): «Календарь»    | Имя диалога без `NuiField`                          |
| `timeLabel`   | `string`            | [словарь](/localization#timefield): «Выбрать время» | Имя кнопки часов                                    |

Плюс `id`, `size`, `disabled`, `required`, `invalid` как у остальных контролов поля и
пропы календаря `locale`, `weekStart`, `min`, `max`, `isDateDisabled`, `weekNumbers`,
`months`, `today`, `todayLabel`, `previousLabel`, `nextLabel`, `monthLabel`, `yearLabel`,
`weekLabel`. Слот `actions` попадает в подвал календаря; методы `focus()`, `open()`,
`close()` через ref. Блок `nui-date-picker` (модификаторы `--size-*`, `--open`, `--invalid`,
`--disabled`, `--readonly`, `--clearable`; элементы `__input`, `__clear`, `__open`, `__panel`,
`__time`).
