# Выбор периода

`NuiDateRangePicker` держит два поля даты в одной рамке и открывает
[календарь](/components/calendar) в режиме `range` на два месяца с пресетами. Модель —
`{ start, end }` со строками `YYYY-MM-DD` или `null`.

<script setup>
import { ref } from 'vue'
const period = ref({ start: '2026-09-21', end: '2026-09-27' })
const presets = [
  { label: 'Сегодня', range: (today) => ({ start: today, end: today }) },
  { label: 'Эта неделя', range: { start: '2026-09-21', end: '2026-09-27' } },
]
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiField label="Период отчёта" description="Два месяца и пресеты">
    <NuiDateRangePicker locale="ru-RU" v-model="period" :presets="presets" clearable today="2026-09-24" end-label="Конец периода" />
  </NuiField>
</div>

```vue
<NuiField label="Период отчёта">
  <NuiDateRangePicker v-model="period" :presets="presets" clearable />
</NuiField>
```

## Поведение

Каждое поле разбирается как в [выборе даты](/components/date-picker); конец раньше
начала меняет их местами. В календаре первый клик открывает диапазон, второй закрывает его и
диалог, пресет делает то же одним нажатием. Кнопка очистки сбрасывает оба конца,
`startName`/`endName` добавляют скрытые inputs для формы. Id поля из `NuiField` стоит на
поле начала, поле конца называется `endLabel`.

## API

| Prop                                  | Тип               | По умолчанию                                                | Описание                   |
| ------------------------------------- | ----------------- | ----------------------------------------------------------- | -------------------------- |
| `v-model`                             | `NuiDateRange`    | `{ start, end }`                                            | Диапазон                   |
| `months`                              | `number`          | `2`                                                         | Месяцев в календаре        |
| `presets`                             | `NuiDatePreset[]` | —                                                           | Пресеты слева от календаря |
| `startPlaceholder` / `endPlaceholder` | `string`          | шаблон локали                                               | Подсказки в полях          |
| `startName` / `endName`               | `string`          | —                                                           | Скрытые inputs для формы   |
| `endLabel`                            | `string`          | [словарь](/guide/localization#datepicker): «Дата окончания» | Имя поля конца             |
| `clearable`                           | `boolean`         | `false`                                                     | Кнопка очистки             |
| `openLabel`                           | `string`          | [словарь](/guide/localization#datepicker): «Выбрать период» | Имя кнопки календаря       |

Остальные пропы, слот `actions`, методы и блок совпадают с [выбором даты](/components/date-picker);
корень получает модификатор `nui-date-picker--range`, между полями стоит `__separator`.
