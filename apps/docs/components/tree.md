# Tree

`NuiTree` показывает иерархию из `items`: раскрытие в `v-model:expanded`, выбор в `v-model`
или `v-model:values`, чекбоксы с каскадом в `v-model:checked`. Иконки папок и файлов
подставляются сами, `virtual` с `height` включает виртуализацию длинных деревьев.

<Example name="tree/Basic" />

## Установка

```ts
import { NuiTree } from '@numior/vue';
import '@numior/vue/styles/tree.css';
```

## Примеры

### Чекбоксы с каскадом

Отметка узла отмечает его потомков, предки становятся отмеченными, когда отмечены все дети, и
частичными, когда часть. Модель хранит значения в порядке документа.

<Example name="tree/Checkable" />

### Ленивая загрузка

Узел с `lazy` без `children` при раскрытии шлёт `load` и крутит спиннер, пока дети не придут.

<Example name="tree/Lazy" />

### Виртуализация

`virtual` с `height` рендерит только видимое окно строк высотой `itemHeight`; активная строка
всегда остаётся в DOM, на сервере рендерятся первые 20 строк.

<Example name="tree/Virtual" />

## Поведение

Клик по шеврону только раскрывает, по чекбоксу — только отмечает, по строке — выбирает,
двойной клик переключает раскрытие. `children: []` — лист, `lazy` без `children` —
раскрываемый узел, который загрузится по `load`.

## Доступность

Корень — единственный элемент в порядке табуляции, активный узел указывается через
`aria-activedescendant`, поэтому размонтирование строк при виртуализации не теряет фокус.
DOM плоский: структуру передают `aria-level`, `aria-setsize` и `aria-posinset`, узлы несут
`aria-expanded`, `aria-selected` и `aria-checked`.

<KeyboardReference name="NuiTree" />

## API

<ApiReference name="NuiTree" />
