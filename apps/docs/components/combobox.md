# Комбобокс

`NuiCombobox` — текстовое поле с `role="combobox"`, которое фильтрует список по мере ввода
и указывает на активную опцию через `aria-activedescendant`, не забирая фокус из поля.
Использует те же `options`, что и `NuiSelect`. Фильтр встроен (без учёта регистра по
подписи), заменяется функцией или отключается `:filter="false"` для серверного поиска;
событие `search` отдаёт текст запроса, `loading` показывает состояние загрузки.

<script setup>
import { ref } from 'vue'
const city = ref()
const keywords = ref([])
const cities = [
  { value: 'kazan', label: 'Казань' },
  { value: 'kaluga', label: 'Калуга' },
  { value: 'moscow', label: 'Москва' },
  { value: 'samara', label: 'Самара' },
]
const words = [
  { value: 'vue', label: 'Vue' },
  { value: 'vite', label: 'Vite' },
  { value: 'playwright', label: 'Playwright' },
]
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiField label="Город">
    <NuiCombobox v-model="city" :options="cities" placeholder="Начните вводить" clearable clear-label="Очистить" toggle-label="Показать города" empty-label="Ничего не найдено" />
  </NuiField>
  <NuiField label="Ключевые слова" description="Enter добавляет своё значение">
    <NuiCombobox v-model="keywords" :options="words" multiple :custom-value="(text) => text" placeholder="Добавить" remove-label="Убрать" toggle-label="Показать варианты" />
  </NuiField>
</div>

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { NuiCombobox, NuiField, type NuiOption } from '@numior/vue';

const city = ref<string>();
const options = ref<NuiOption<string>[]>([]);
const loading = ref(false);
const search = async (query: string) => {
  loading.value = true;
  options.value = await api.cities(query);
  loading.value = false;
};
</script>

<template>
  <NuiField label="Город">
    <NuiCombobox
      v-model="city"
      :options="options"
      :filter="false"
      :loading="loading"
      @search="search"
    />
  </NuiField>
</template>
```

## Поведение

- Ввод открывает список и фильтрует его; активной становится первая подходящая опция.
  ArrowDown/ArrowUp открывают полный список и двигают активную опцию, Enter выбирает её,
  Esc закрывает список (и не закрывает диалог вокруг), Tab и уход фокуса закрывают.
- В одиночном режиме поле показывает подпись выбранной опции; если текст изменён, но
  ничего не выбрано, при уходе фокуса подпись восстанавливается.
- `customValue` — функция из текста в значение: тогда Enter без активной опции или уход
  фокуса добавляет введённый текст (для строковых моделей `(text) => text`).
- В `multiple` выбранные значения показаны `NuiChip` в порядке выбора; крестик чипа и
  Backspace в пустом поле удаляют, Enter добавляет и оставляет список открытым. Клик по
  любому месту поля фокусирует ввод и открывает список.
- Дебаунс и кэш запросов остаются за приложением: `search` приходит на каждый ввод.

## Доступность

Поле — нативный `<input role="combobox" aria-autocomplete="list">` с `aria-expanded`,
`aria-controls` и `aria-activedescendant`; список — `role="listbox"` с `aria-busy` при
загрузке. Список открыт как `popover="manual"`, потому что текстовое поле не может быть
invoker'ом попапа: закрытие следует за фокусом, а клик по опции не отбирает фокус у поля.
Кнопки очистки, переключения и удаления чипа имеют доступные имена и `tabindex="-1"`,
чтобы не удлинять путь по Tab.

## API

| Prop           | Тип                                   | По умолчанию     | Описание                         |
| -------------- | ------------------------------------- | ---------------- | -------------------------------- |
| `v-model`      | `T \| T[]`                            | —                | Значение или массив в `multiple` |
| `options`      | `NuiOptionSource<T>`                  | —                | Опции и группы                   |
| `multiple`     | `boolean`                             | `false`          | Чипы и несколько значений        |
| `filter`       | `(option, query) => boolean \| false` | по подписи       | Свой фильтр или отключение       |
| `loading`      | `boolean`                             | `false`          | Состояние загрузки               |
| `customValue`  | `(text: string) => T`                 | —                | Разрешить свои значения          |
| `clearable`    | `boolean`                             | `false`          | Кнопка очистки                   |
| `placeholder`  | `string`                              | —                | Текст без значения               |
| `name`         | `string`                              | —                | Скрытые поля формы               |
| `getKey`       | `(value: T) => string`                | по значению      | Ключ для объектов                |
| `placement`    | `FloatingPlacement`                   | `'bottom-start'` | Сторона списка                   |
| `emptyLabel`   | `string`                              | `'No matches'`   | Текст пустого списка             |
| `loadingLabel` | `string`                              | `'Loading'`      | Текст загрузки                   |
| `clearLabel`   | `string`                              | `'Clear'`        | Имя кнопки очистки               |
| `removeLabel`  | `string`                              | `'Remove'`       | Префикс имени крестика чипа      |
| `toggleLabel`  | `string`                              | `'Show options'` | Имя кнопки-переключателя         |

Событие `search(query)`. Плюс `id`, `size`, `disabled`, `required`, `invalid`; слот
`option="{ option, selected, active }"`; `focus()` через ref. Блок `nui-combobox`
(модификаторы `--size-*`, `--open`, `--multiple`, `--invalid`, `--disabled`; элементы
`__field`, `__input`, `__chip` (это `NuiChip`), `__clear`, `__toggle`, `__chevron`, `__listbox`)
поверх общего `nui-listbox`.
