# Поле времени

`NuiTimeField` редактирует время как набор сегментов: часы, минуты, при необходимости
секунды и AM/PM. Порядок сегментов, разделители, цифры и 12- или 24-часовой цикл выводятся
из локали через `Intl`, а модель всегда остаётся строкой `HH:mm` (или `HH:mm:ss` с `seconds`)
без часового пояса. Кнопка с часами открывает список подсказок с шагом `step`.

<script setup>
import { ref } from 'vue'
const start = ref('09:30')
const meeting = ref(null)
const precise = ref('13:05:09')
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiField label="Начало" description="С 09:00 до 18:00, шаг 30 минут">
    <NuiTimeField locale="ru-RU" v-model="start" min="09:00" max="18:00" :step="30" />
  </NuiField>
  <NuiField label="Meeting" description="12-hour cycle from the locale">
    <NuiTimeField locale="en-US" v-model="meeting" />
  </NuiField>
  <NuiField label="الوقت" description="Арабские цифры и периоды">
    <NuiTimeField locale="ar-EG" v-model="precise" seconds />
  </NuiField>
</div>

```vue
<NuiField label="Начало">
  <NuiTimeField v-model="start" min="09:00" max="18:00" :step="30" />
</NuiField>
```

## Поведение

Цифры вводятся посегментно: сегмент заполняется и переходит к следующему, как только
следующая цифра не может продолжить число (`1` ждёт, `3` переходит сразу), вставка `0930`
растекается по сегментам. Буквы `a`/`p` и первые буквы локальных подписей задают период. ↑/↓
меняют сегмент с переносом (`23` → `00`), Home/End ведут к границам сегмента, Backspace и
Delete очищают его, ←/→ и Enter переключают сегменты, PageUp/PageDown сдвигают всё время на
`step` минут в пределах `min`/`max`, Alt+↓ открывает подсказки. Клик по пустому месту поля
ставит фокус в первый незаполненный сегмент, а если всё заполнено — в часы. Модель становится `null`,
пока хотя бы один сегмент пуст, а полное значение, вышедшее за `min`/`max`, зажимается,
когда фокус покидает поле. Локаль берётся из конфига или пропа `locale`, `hourCycle`
принудительно задаёт 12 или 24 часа, `seconds` добавляет сегмент секунд; при смене локали
или цикла черновик перестраивается из модели.

## Доступность

Сегменты — нативные `<input role="spinbutton">` с `aria-valuenow`, границами и
`aria-valuetext`, подписи берутся из `Intl.DisplayNames`. Группа `role="group"` получает
подпись и описание из `NuiField`, id поля стоит на сегменте часов, в Tab-порядке остаётся
один сегмент. Ряд сегментов всегда идёт слева направо, даже в RTL. Список подсказок — тот же
`listbox`, что у select: стрелки, Enter, Escape, закрытие по уходу фокуса и возврат фокуса
на часы.

## API

| Prop         | Тип                    | По умолчанию                                                 | Описание                        |
| ------------ | ---------------------- | ------------------------------------------------------------ | ------------------------------- |
| `v-model`    | `string \| null`       | `null`                                                       | `HH:mm` или `HH:mm:ss`          |
| `seconds`    | `boolean`              | `false`                                                      | Сегмент секунд                  |
| `hourCycle`  | `'h12' \| 'h23'`       | из локали                                                    | Принудительный цикл             |
| `locale`     | `string`               | из конфига                                                   | Локаль раскладки и подписей     |
| `min`, `max` | `string`               | —                                                            | Границы для зажима и подсказок  |
| `step`       | `number`               | `15`                                                         | Шаг подсказок и PageUp/PageDown |
| `readonly`   | `boolean`              | `false`                                                      | Только чтение                   |
| `name`       | `string`               | —                                                            | Скрытый `input` со значением    |
| `placement`  | `FloatingPlacement`    | `'bottom-start'`                                             | Сторона списка подсказок        |
| `clockLabel` | `string`               | [словарь](/localization#timefield): «Выбрать время»          | Подпись кнопки с часами         |
| `emptyLabel` | `string`               | [словарь](/localization#timefield): «Нет доступного времени» | Текст пустого списка            |
| `size`       | `'sm' \| 'md' \| 'lg'` | `'md'`                                                       | Ступень размера                 |
| `id`         | `string`               | из поля                                                      | Явный id (ставится на часы)     |
| `disabled`   | `boolean`              | из поля                                                      | Отключение                      |
| `required`   | `boolean`              | из поля                                                      | `aria-required` на сегментах    |
| `invalid`    | `boolean`              | из поля                                                      | `aria-invalid` и красная рамка  |

Метод `focus()` фокусирует часы. Блок `nui-time-field` (модификаторы `--size-*`, `--open`,
`--invalid`, `--disabled`, `--readonly`; элементы `__segments`, `__segment` с `--type-*`,
`__literal`, `__clock`, `__listbox`; переменные `--_height`, `--_padding`, `--_font-size`,
`--_segment-radius`).
