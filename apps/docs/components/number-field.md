# Числовое поле

`NuiNumberField` — текстовое поле с ролью `spinbutton`, которое хранит `number | null`, а
показывает число в формате локали: разделители групп и дробной части, валюту, проценты и
локальные цифры через `Intl.NumberFormat`. Пока поле в фокусе, текст остаётся таким, каким
его ввёл пользователь; по blur или Enter значение разбирается, зажимается в `min`/`max` и
форматируется заново.

<script setup>
import { ref } from 'vue'
const price = ref(1234.5)
const quantity = ref(2)
const discount = ref(0.15)
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiField label="Цена" description="Евро, шаг 0,5">
    <NuiNumberField locale="ru-RU" v-model="price" :min="0" :step="0.5" :format-options="{ style: 'currency', currency: 'EUR' }" increment-label="Увеличить" decrement-label="Уменьшить" />
  </NuiField>
  <NuiField label="Количество" description="От 0 до 10">
    <NuiNumberField locale="ru-RU" v-model="quantity" :min="0" :max="10" increment-label="Увеличить" decrement-label="Уменьшить" />
  </NuiField>
  <NuiField label="Скидка" description="Проценты без степперов">
    <NuiNumberField locale="ru-RU" v-model="discount" :min="0" :max="1" :step="0.01" :steppers="false" :format-options="{ style: 'percent' }" />
  </NuiField>
</div>

```vue
<NuiField label="Цена">
  <NuiNumberField
    v-model="price"
    :min="0"
    :step="0.5"
    :format-options="{ style: 'currency', currency: 'EUR' }"
  />
</NuiField>
```

## Поведение

Локаль берётся из `createNuiConfig({ locale })` или ближайшего `provideNuiConfig({ locale })`, проп
`locale` переопределяет её точечно, без настройки действует `en-US`; `navigator.language`
не читается, чтобы сервер и клиент форматировали одинаково. При разборе принимаются
локальные и ASCII-цифры, разделитель дробной части локали (и точка там, где она не
разделитель групп), пробелы и разделители групп отбрасываются, минус в любой форме и
скобки дают отрицательное число, а при `style: 'percent'` введённое число делится на 100.
Нераспознанный текст очищает значение. В локалях с точкой-разделителем групп (`de-DE`)
строка `1.5` читается как 15, как и в самом `Intl`.

Клавиши: ↑/↓ меняют значение на `step`, с Shift — на десять шагов, PageUp/PageDown — тоже
на десять, Home/End ведут к `min`/`max`. Шаг считается в целых числах, поэтому `0.7 + 0.1`
даёт ровно `0.8`; значения снапятся к сетке от `min`, пустое поле по ↑ становится `1` или
`min`. Без явных опций точность формата расширяется до знаков шага; `formatOptions` с
заданными digits или валютой не трогаются. `notation` кроме `standard` форматируется, но
не разбирается обратно. Enter коммитит значение и не мешает отправке формы.

## Доступность

Единственный доступный элемент — `<input role="spinbutton" inputmode="decimal">` с
`aria-valuenow`, `aria-valuemin`, `aria-valuemax` и `aria-valuetext` в формате локали.
Степперы лежат в обёртке `aria-hidden` с `tabindex="-1"` и не забирают фокус у поля. На iOS
клавиатура `decimal` не показывает минус: для отрицательных значений передайте
`inputmode="text"` атрибутом.

## API

| Prop             | Тип                        | По умолчанию  | Описание                           |
| ---------------- | -------------------------- | ------------- | ---------------------------------- |
| `v-model`        | `number \| null`           | `null`        | Значение                           |
| `min`, `max`     | `number`                   | —             | Границы, зажим при коммите и шаге  |
| `step`           | `number`                   | `1`           | Шаг клавиш и степперов             |
| `formatOptions`  | `Intl.NumberFormatOptions` | —             | Валюта, проценты, знаки            |
| `locale`         | `string`                   | из конфига    | Локаль формата и разбора           |
| `steppers`       | `boolean`                  | `true`        | Кнопки ± у края                    |
| `readonly`       | `boolean`                  | `false`       | Только чтение, степперы выключены  |
| `name`           | `string`                   | —             | Скрытый `input` с числом для формы |
| `incrementLabel` | `string`                   | `'Increment'` | Подпись кнопки «+»                 |
| `decrementLabel` | `string`                   | `'Decrement'` | Подпись кнопки «−»                 |
| `size`           | `'sm' \| 'md' \| 'lg'`     | `'md'`        | Ступень размера                    |
| `id`             | `string`                   | из поля       | Явный id контрола                  |
| `disabled`       | `boolean`                  | из поля       | Отключение                         |
| `required`       | `boolean`                  | из поля       | Обязательность                     |
| `invalid`        | `boolean`                  | из поля       | `aria-invalid` и красная рамка     |

Слоты: `prefix`, `suffix`. Метод `focus()` доступен через template ref. Блок
`nui-number-field` (модификаторы `--size-*`, `--invalid`, `--disabled`, `--readonly`,
`--steppers`; элементы `__control`, `__prefix`, `__suffix`, `__steppers`, `__stepper` с
`--up`/`--down`; переменные `--_height`, `--_padding`, `--_font-size`, `--_stepper`).
