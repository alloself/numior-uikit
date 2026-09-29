# Tree

`NuiTree` показывает иерархию из `items`: раскрытие в `v-model:expanded`, выбор в `v-model`
или `v-model:values`, чекбоксы с каскадом в `v-model:checked`. Дерево стоит на каркасе
`NuiList`: те же строки `NuiListItem`, варианты `plain`, `divided` и `bordered`, размеры,
бейджи и шорткаты. Иконки папок и файлов подставляются сами, `virtual` с `height` включает
виртуализацию длинных деревьев.

<Example name="tree/Basic" />

## Установка

```ts
import { NuiTree } from '@numior/vue';
import '@numior/vue/styles/list.css';
import '@numior/vue/styles/tree.css';
```

## Примеры

### Варианты и хвосты строк

Узел — тот же пункт списка: `badge` и `shortcut` встают у конца строки. `current` отмечает
текущий узел независимо от выбора. `variant="bordered"` рисует рамку, `size` меняет высоту
строк.

<Example name="tree/Variants" />

### Чекбоксы с каскадом

Отметка узла отмечает его потомков, предки становятся отмеченными, когда отмечены все дети, и
частичными, когда часть. Модель хранит значения в порядке документа.

<Example name="tree/Checkable" />

### Ленивая загрузка

Узел с `lazy` без `children` при раскрытии шлёт `load` и крутит спиннер, пока дети не придут.

<Example name="tree/Lazy" />

### Виртуализация

`virtual` с `height` рендерит только видимое окно строк; высота строки берётся от `size`,
`itemHeight` задаёт её явно. Активная строка всегда остаётся в DOM, на сервере рендерятся
первые 20 строк.

<Example name="tree/Virtual" />

## Поведение

Клик по шеврону только раскрывает, по чекбоксу — только отмечает, по строке — выбирает,
двойной клик переключает раскрытие. `children: []` — лист, `lazy` без `children` —
раскрываемый узел, который загрузится по `load`. Ссылок в узлах нет: переход делает
приложение по событию `select`.

## Доступность

Корень — единственный элемент в порядке табуляции, активный узел указывается через
`aria-activedescendant`, поэтому размонтирование строк при виртуализации не теряет фокус.

Разметка — `ul` и `li` списка с ролями `tree` и `treeitem`. DOM плоский: структуру передают
`aria-level`, `aria-setsize` и `aria-posinset`. Узлы несут `aria-expanded`, `aria-selected`,
`aria-checked` и `aria-current`.

<KeyboardReference name="NuiTree" />

## API

<ApiReference name="NuiTree" />
