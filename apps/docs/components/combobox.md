# Combobox

`NuiCombobox` — текстовое поле с `role="combobox"`: список фильтруется по мере ввода, активная
опция подсвечивается, а фокус остаётся в поле. Опции те же, что у `NuiSelect`.

<Example name="combobox/Basic" />

## Установка

```ts
import { NuiCombobox } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/list.css';
import '@numior/vue/styles/chip.css';
import '@numior/vue/styles/combobox.css';
```

## Примеры

### Несколько значений

`multiple` показывает выбранное чипами в порядке выбора; `customValue` превращает введённый
текст в новое значение по Enter.

<Example name="combobox/Multiple" />

### Серверный поиск

`:filter="false"` отключает встроенный фильтр, событие `search` отдаёт запрос на каждый ввод,
`loading` показывает загрузку. Дебаунс и кэш остаются за приложением.

<Example name="combobox/Async" />

### Своя разметка опции

Слот `option` получает опцию и её состояния.

<Example name="combobox/Option" />

## Доступность

Поле — нативный `<input role="combobox" aria-autocomplete="list">` с `aria-expanded`,
`aria-controls` и `aria-activedescendant`; список — `role="listbox"` с `aria-busy` при
загрузке. Кнопки очистки, раскрытия и удаления чипа не попадают в порядок табуляции, а их
действия доступны с клавиатуры из поля.

<KeyboardReference name="NuiCombobox" />

## API

<ApiReference name="NuiCombobox" />
