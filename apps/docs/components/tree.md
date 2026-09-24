# Дерево

`NuiTree` показывает иерархию из данных `items` (`value`, `label`, `description`, `icon`,
`disabled`, `children`, `lazy`): раскрытие в `v-model:expanded`, выбор в `v-model` (`selectable`
— `single`, `multiple` или `false`), чекбоксы с каскадом в `v-model:checked` при `checkable`.
Узел с `lazy` без `children` при раскрытии эмитит `load` и крутит спиннер, пока дети не
придут. Дочерние строки разворачиваются и сворачиваются по высоте за
`--nui-duration-normal` вместе с поворотом шеврона, иконки `folder`/`folder-open`/`file`
подставляются сами и меняются мгновенно, без анимации появления (`icons="false"` или
`icon: false` у узла отключают). `virtual` с `height` включает виртуализацию длинных деревьев
на примитиве `useVirtualList`.

<script setup>
import { ref } from 'vue'
const selected = ref('index')
const expanded = ref(['src'])
const checked = ref([])
const files = ref([
  { value: 'src', label: 'Исходники', children: [
    { value: 'components', label: 'Компоненты', children: [
      { value: 'button', label: 'Кнопка.vue' },
      { value: 'input', label: 'Поле.vue', disabled: true },
    ] },
    { value: 'index', label: 'index.ts', description: 'точка входа' },
  ] },
  { value: 'docs', label: 'Документация', lazy: true },
  { value: 'design', label: 'Дизайн', children: [{ value: 'logo', label: 'logo.svg', icon: 'image' }] },
])
const load = ({ value }) => setTimeout(() => {
  files.value = files.value.map((item) => item.value === value ? { ...item, children: [{ value: 'guide', label: 'Руководство.md' }] } : item)
}, 600)
const nodes = Array.from({ length: 5000 }, (_, i) => ({ value: `n${i}`, label: `Узел ${i + 1}`, children: [{ value: `n${i}-leaf`, label: `Лист ${i + 1}` }] }))
</script>

<div class="vp-raw nui-demo" data-nui-theme="light" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); align-items: start">
  <NuiTree v-model="selected" v-model:expanded="expanded" :items="files" label="Файлы" @load="load" />
  <NuiTree v-model:checked="checked" :items="files" :selectable="false" checkable label="Экспорт" />
  <NuiTree :items="nodes" virtual height="12rem" label="Большое дерево" />
</div>

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { NuiTree, type NuiTreeItem } from '@numior/vue';
import '@numior/vue/styles/tree.css';

const selected = ref<string>();
const expanded = ref<string[]>([]);
const files = ref<NuiTreeItem<string>[]>([{ value: 'docs', label: 'Документация', lazy: true }]);
const load = async (item: NuiTreeItem<string>) => {
  const children = await api.children(item.value);
  files.value = files.value.map((entry) =>
    entry.value === item.value ? { ...entry, children } : entry,
  );
};
</script>

<template>
  <NuiTree
    v-model="selected"
    v-model:expanded="expanded"
    :items="files"
    label="Файлы"
    @load="load"
  />
</template>
```

## Поведение

Дерево держит плоскую модель видимых узлов и работает по ней: клавиатура, `aria-level`,
`aria-setsize`/`aria-posinset`, каскад чекбоксов и виртуализация читают одну и ту же
последовательность. Клавиши по WAI-ARIA treeview: ↑/↓ — по включённым узлам, Home/End,
PageUp/PageDown, → раскрывает или входит в первого ребёнка, ← сворачивает или поднимается
к родителю, `*` раскрывает всех соседей, Enter выбирает (в `multiple` — переключает), Space
переключает чекбокс, печатные символы ищут по подписям видимых узлов; в RTL ← и → меняются
местами. Клик по шеврону только раскрывает, по чекбоксу — только отмечает, по строке —
выбирает, двойной клик переключает раскрытие.

Каскад: отметка узла отмечает его включённых потомков, предки становятся `checked`, когда все
их включённые дети отмечены, и `mixed`, когда часть; отключённые узлы и их поддеревья не
меняются. Модель `checked` хранит значения в порядке документа. `children: []` — лист,
`lazy` без `children` — раскрываемый узел, который загрузится по `load`.

## Доступность

Корень — единственный элемент в Tab-порядке (`role="tree" tabindex="0"`), активный узел
указывается через `aria-activedescendant`, поэтому размонтирование строк при виртуализации
не теряет фокус, а активная строка всегда остаётся отрисованной. DOM плоский: вложенные
`role="group"` невозможны при оконном рендере, структуру передают `aria-level`,
`aria-setsize` и `aria-posinset`. Узлы несут `aria-expanded`, `aria-selected`,
`aria-checked` (`mixed`), `aria-disabled`, `aria-busy`. Имя дерева — `label` или `labelledBy`.

## Виртуализация

`virtual` с `height` рендерит только видимое окно строк фиксированной высоты `itemHeight`
(по умолчанию 32px) плюс запас, а активная строка удерживается в DOM. На сервере
рендерятся первые 20 строк. Примитив `useVirtualList` из `@numior/primitives` принимает
контейнер, `count`, `itemSize` (число или функция), `overscan`, `initialCount`, `enabled`,
`pinned` и отдаёт `range`, `items` (`index`, `start`, `size`), `totalSize`, `startSize`/`endSize`
для распорок, `scrollTo(index, { align })` и `measure()`. Таблица использует его же.

## API

| Prop                        | Тип                               | По умолчанию | Описание                            |
| --------------------------- | --------------------------------- | ------------ | ----------------------------------- |
| `items`                     | `NuiTreeItem<T>[]`                | —            | Узлы                                |
| `modelValue`                | `T \| T[]`                        | —            | Выбор (`v-model`)                   |
| `expanded`                  | `T[]`                             | `[]`         | Раскрытые узлы (`v-model:expanded`) |
| `checked`                   | `T[]`                             | `[]`         | Отмеченные узлы (`v-model:checked`) |
| `selectable`                | `'single' \| 'multiple' \| false` | `'single'`   | Режим выбора                        |
| `checkable`                 | `boolean`                         | `false`      | Чекбоксы с каскадом                 |
| `getKey`                    | `(value: T) => string`            | —            | Ключ объектных значений             |
| `icons`                     | `boolean`                         | `true`       | Иконки папок и файлов               |
| `virtual`                   | `boolean`                         | `false`      | Виртуализация (нужен `height`)      |
| `height`                    | `string`                          | —            | Высота прокручиваемой области       |
| `itemHeight`                | `number`                          | `32`         | Высота строки в px при `virtual`    |
| `size`                      | `'sm' \| 'md' \| 'lg'`            | `'md'`       | Высота строки                       |
| `loop`                      | `boolean`                         | `false`      | Циклические ↑/↓                     |
| `typeahead`                 | `boolean`                         | `true`       | Поиск по первым буквам              |
| `label`, `labelledBy`, `id` | `string`                          | —            | Имя и идентификатор                 |

События `expand`, `collapse`, `load`, `select` с узлом. Слот `item`
(`{ item, level, expanded, selected, checked, loading }`). Блок `nui-tree`, модификаторы
`--size-*`, `--virtual`, `--checkable`, `--multiple`; элементы `__list`, `__item` (`--active`,
`--selected`, `--disabled`, `--expanded`, `--loading`), `__toggle`, `__chevron`, `__spinner`,
`__checkbox` (`--checked`, `--indeterminate`), `__icon`, `__text`, `__label`, `__description`;
переменные `--_indent`, `--_row`, `--_height`, `--_level`, `--_start`.
