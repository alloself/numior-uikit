# List

`NuiList` — семантический `ul` или `ol` с вариантами `plain`, `divided`, `bordered`, `floating`
и `nav` и пунктами `NuiListItem`. Пункт с `href` становится ссылкой, с `interactive` —
кнопкой; `selectable` превращает список в `listbox` с `v-model` и клавиатурой.

<Example name="list/Basic" />

## Установка

```ts
import { NuiList, NuiListItem } from '@numior/vue';
import '@numior/vue/styles/list.css';
```

## Примеры

### Выбор значений

`selectable="multiple"` держит выбранное в `v-model:values`, `single` — в `v-model`. Пункты
из `items` получают `role="option"`, недоступные остаются в списке.

<Example name="list/Selectable" />

### Навигация

`variant="nav"` — компактные строки без разделителей, на которых построена боковая панель.
`current` отмечает текущую страницу, `badge` и `shortcut` встают у конца строки.

<Example name="list/Nav" />

### Группы

`items` принимает группы `{ label, items }`: заголовок группы становится `role="group"` с
подписью, а навигация идёт по всем опциям насквозь.

<Example name="list/Groups" />

## Поведение

В обычном режиме список не перехватывает клавиатуру: ссылки и кнопки доступны по Tab как есть.
В выбираемом списке в порядке табуляции остаётся один пункт, стрелки и набор букв двигают
фокус. Тот же список в варианте `floating` — выпадающий список `NuiSelect` и `NuiCombobox`.

<KeyboardReference name="NuiList" />

## API

<ApiReference :names="['NuiList', 'NuiListItem']" />
