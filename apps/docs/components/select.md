# Выбор из списка

`NuiSelect` — кнопка с `role="combobox"`, открывающая список `role="listbox"` в нативном
popover шириной не меньше триггера. Значения приходят через `options`: плоские записи
`{ value, label, description?, disabled?, icon? }` или группы `{ label, options }`.
Поддерживает одиночный и множественный выбор, очистку, набор первых букв на закрытом
триггере и скрытые `<input type="hidden">` для отправки формы.

<script setup>
import { ref } from 'vue'
const country = ref()
const tags = ref(['frontend'])
const countries = [
  { value: 'at', label: 'Австрия' },
  { value: 'de', label: 'Германия', description: 'Берлин' },
  { value: 'dk', label: 'Дания', disabled: true },
  { label: 'Азия', items: [{ value: 'vn', label: 'Вьетнам' }, { value: 'jp', label: 'Япония' }] },
]
const tagOptions = [
  { value: 'frontend', label: 'Фронтенд' },
  { value: 'backend', label: 'Бэкенд' },
  { value: 'design', label: 'Дизайн' },
]
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiField label="Страна">
    <NuiSelect v-model="country" :options="countries" placeholder="Выберите страну" clearable clear-label="Очистить" />
  </NuiField>
  <NuiField label="Теги">
    <NuiSelect v-model="tags" :options="tagOptions" multiple :count-label="(n) => `${n} выбрано`" />
  </NuiField>
</div>

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { NuiField, NuiSelect, type NuiOptionSource } from '@numior/vue';

const country = ref<string>();
const countries: NuiOptionSource<string> = [
  { value: 'at', label: 'Австрия' },
  { value: 'de', label: 'Германия', description: 'Берлин' },
  { label: 'Азия', items: [{ value: 'vn', label: 'Вьетнам' }] },
];
</script>

<template>
  <NuiField label="Страна">
    <NuiSelect v-model="country" :options="countries" placeholder="Выберите страну" clearable />
  </NuiField>
</template>
```

## Поведение

- Клик, Enter и Space открывают список на выбранной опции, ArrowDown/ArrowUp — на первой
  или последней, Home/End — по краям. Внутри работают стрелки с зацикливанием, Home/End и
  набор первых букв; Esc закрывает, Tab и уход фокуса тоже.
- На закрытом триггере набор букв меняет значение без открытия, как у нативного `<select>`.
- В одиночном режиме Enter, Space и клик выбирают и закрывают. В `multiple` Space и клик
  переключают опцию, список остаётся открытым, Enter закрывает; в триггере видна подпись
  одной опции или `countLabel(count)`.
- `clearable` добавляет кнопку очистки, `disabled`-опции остаются в списке и пропускаются,
  `name` даёт по скрытому полю на каждое значение.

## Доступность

Триггер — нативная `<button role="combobox">` с `aria-haspopup="listbox"`, `aria-expanded` и
`aria-controls`; внутри `NuiField` он получает `id`, `aria-labelledby`, `aria-describedby`,
`aria-invalid` и `aria-required`. Список — `role="listbox"` (`aria-multiselectable` в
`multiple`), группы — `role="group"` с подписью, опции — `role="option"` с `aria-selected` и
`aria-disabled`. Значения-объекты требуют `getKey`, иначе ключом становится JSON.

## API

| Prop          | Тип                         | По умолчанию     | Описание                         |
| ------------- | --------------------------- | ---------------- | -------------------------------- |
| `v-model`     | `T \| T[]`                  | —                | Значение или массив в `multiple` |
| `options`     | `NuiOptionSource<T>`        | —                | Опции и группы                   |
| `multiple`    | `boolean`                   | `false`          | Несколько значений               |
| `clearable`   | `boolean`                   | `false`          | Кнопка очистки                   |
| `placeholder` | `string`                    | —                | Текст без значения               |
| `name`        | `string`                    | —                | Скрытые поля формы               |
| `getKey`      | `(value: T) => string`      | по значению      | Ключ для объектов                |
| `loop`        | `boolean`                   | `true`           | Зацикливание стрелок             |
| `placement`   | `FloatingPlacement`         | `'bottom-start'` | Сторона списка                   |
| `countLabel`  | `(count: number) => string` | `N selected`     | Подпись при нескольких значениях |
| `emptyLabel`  | `string`                    | `'No options'`   | Текст пустого списка             |
| `clearLabel`  | `string`                    | `'Clear'`        | Доступное имя кнопки очистки     |

Плюс `id`, `size`, `disabled`, `required`, `invalid` как у остальных контролов поля. Слоты
`value="{ selected }"` и `option="{ option, selected, active }"`. Блок `nui-select`
(модификаторы `--size-*`, `--open`, `--empty`, `--clearable`, `--invalid`, `--disabled`;
элементы `__trigger`, `__value`, `__chevron`, `__clear`, `__listbox`). Выпадающий список — это
[`NuiList`](/components/list) в варианте `floating`: те же группы, пункты `nui-list-item` с
`--active`, `--selected`, `--disabled` и состояния `__status`/`__empty`.
