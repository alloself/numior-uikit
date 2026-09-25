# Список

`NuiList` — семантический `ul`/`ol` (`as`) с вариантами `plain`, `divided`, `bordered`,
`floating` и пунктами `NuiListItem`: слоты `leading`, `default`, `description`, `trailing`
или пропы `label`, `description`, `icon`. Пункт с `href`/`to` становится ссылкой, с `@click`
или `interactive` — кнопкой. Проп `items` рисует те же пункты из данных, принимает группы
`{ label, items }`, а пустой массив показывает [пустое состояние](/components/empty).
Режим `selectable` (`single` или `multiple`) превращает список в `role="listbox"` с
`v-model`, клавиатурой и typeahead. Этот же компонент в варианте `floating` — выпадающий
список `NuiSelect`, `NuiCombobox` и `NuiTimeField`: другого списка опций в ките нет.

<script setup>
import { ref } from 'vue'
const picked = ref(['go'])
const channel = ref('push')
const languages = [
  { label: 'Go', value: 'go' },
  { label: 'Rust', value: 'rust' },
  { label: 'Ruby', value: 'ruby', disabled: true },
  { label: 'Котлин', value: 'kotlin' },
]
const links = [
  {
    label: 'Ссылки',
    items: [
      { label: 'Документация', description: 'Руководства и API', href: '#docs', icon: 'file' },
      { label: 'Репозиторий', href: '#repo', icon: 'external-link' },
    ],
  },
  {
    label: 'Действия',
    items: [{ label: 'Запустить проверку', description: 'Кнопка внутри списка', onClick: () => {} }],
  },
]
</script>

<div class="vp-raw nui-demo" data-nui-theme="light" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); align-items: start">
  <NuiList variant="divided" :items="links" />
  <NuiList v-model="picked" selectable="multiple" variant="bordered" label="Языки" :items="languages" />
  <NuiList v-model="channel" selectable="single" variant="bordered" label="Канал">
    <NuiListItem value="email" label="Почта" description="Ежедневный дайджест" icon="inbox" />
    <NuiListItem value="push" label="Push" description="Мгновенно" />
    <NuiListItem value="none" label="Не присылать" />
  </NuiList>
  <NuiList :items="[]" variant="bordered" empty-label="Задач нет" />
</div>

```vue
<script setup lang="ts">
import { NuiList, NuiListItem } from '@numior/vue';
import '@numior/vue/styles/list.css';
</script>

<template>
  <NuiList variant="divided">
    <NuiListItem label="Документация" description="Руководства и API" href="/docs" icon="file" />
    <NuiListItem label="Профиль" :to="{ name: 'profile' }" :as="RouterLink">
      <template #leading><NuiAvatar :name="user.name" size="sm" /></template>
      <template #trailing><NuiBadge tone="success" dot label="В сети" /></template>
    </NuiListItem>
    <NuiListItem label="Выйти" @click="logout" />
  </NuiList>
  <NuiList v-model="channel" selectable="single" label="Канал" :items="channels" />
  <NuiList
    variant="bordered"
    :items="[
      { label: 'Ссылки', items: [{ label: 'Документация', href: '/docs' }] },
      { label: 'Действия', items: [{ label: 'Выйти', onClick: logout }] },
    ]"
  />
</template>
```

Группы `{ label, items }` рисуются заголовком секции `nui-list__group-label`, пункты группы
сдвинуты на `--_indent` (во всплывающем списке отступ меньше), между группами —
разделитель. В выбираемом списке группа получает `role="group"` с этой подписью, а id опций
остаются сквозными, поэтому select и combobox навигируют по группам без дополнительной
логики.

## Поведение

В обычном режиме список не перехватывает клавиатуру: ссылки и кнопки пунктов доступны по
Tab как есть. В режиме `selectable` пункты с `value` получают `role="option"`, фокус
двигается стрелками, Home/End и набором первых букв (`useListNavigation`), в Tab-порядке
остаётся один пункт — выбранный или первый. Enter и Space выбирают (в `multiple` —
переключают), клик тоже. Пункт без `value` в выбираемом списке остаётся обычным `li`, а
`href`/`@click` у пункта с `value` игнорируются: смешивать выбор и навигацию не нужно.
Объектные значения сравниваются через `getKey`. Выбранный пункт получает фон
`--nui-primary-soft`, а заголовок, иконки и галочка — цвет `--nui-primary-soft-foreground`;
галочка стоит у правого края, чтобы текст не сдвигался. Событие `select(item)` приходит при
каждом выборе пункта из `items`. Владелец, который сам ведёт клавиатуру (select, combobox),
передаёт `keyboard=false`, подсвечивает активный пункт через `activeId` и показывает
загрузку через `loading`.

## Доступность

Статический список — `ul`/`ol` с `li`; ссылки — `NuiLink`, кнопки — `<button>`. Выбираемый
список — `role="listbox"` (`aria-multiselectable` для `multiple`) с именем из `label`,
пункты — `role="option"` с `aria-selected`, отключённые — `aria-disabled`. Один tab stop
детерминирован уже на сервере.

## API

| Prop           | Тип                                                | По умолчанию | Описание                                                    |
| -------------- | -------------------------------------------------- | ------------ | ----------------------------------------------------------- |
| `id`           | `string`                                           | генерируется | Id корня и основа id пунктов                                |
| `as`           | `'ul' \| 'ol'`                                     | `'ul'`       | Тег списка                                                  |
| `variant`      | `'plain' \| 'divided' \| 'bordered' \| 'floating'` | `'plain'`    | Разделители, рамка или всплывающая поверхность              |
| `size`         | `'sm' \| 'md' \| 'lg'`                             | `'md'`       | Высота строки (токены контролов)                            |
| `items`        | `NuiListSource<E>`                                 | —            | Пункты и группы `{ label, items }`; `[]` — пустое состояние |
| `selectable`   | `'single' \| 'multiple'`                           | —            | Режим выбора                                                |
| `modelValue`   | `T \| T[]`                                         | —            | Выбор (`v-model`)                                           |
| `getKey`       | `(value: T) => string`                             | —            | Ключ объектных значений                                     |
| `loop`         | `boolean`                                          | `true`       | Циклические стрелки                                         |
| `typeahead`    | `boolean`                                          | `true`       | Поиск по первым буквам                                      |
| `keyboard`     | `boolean`                                          | `true`       | `false` — клавиатурой управляет владелец                    |
| `activeId`     | `string`                                           | —            | Id пункта с виртуальным фокусом                             |
| `loading`      | `boolean`                                          | `false`      | Строка загрузки вместо пустого состояния                    |
| `loadingLabel` | `string`                                           | `'Loading'`  | Подпись загрузки                                            |
| `label`        | `string`                                           | —            | Имя списка                                                  |
| `labelledBy`   | `string`                                           | —            | Id внешней подписи                                          |
| `emptyLabel`   | `string`                                           | `'No items'` | Заголовок пустого состояния                                 |
| `linkAs`       | `string \| Component`                              | `'a'`        | Компонент роутера для пунктов из `items`                    |

`NuiListItem`: `value`, `id`, `label`, `description`, `icon`, `href`, `to`, `as`, `interactive`,
`disabled`; слоты `leading`, `default`, `description`, `trailing`. Слоты списка: `item`
(`{ item, selected, active }`) для пунктов из `items`, `empty`; событие `select(item)`. Блоки
`nui-list` (модификаторы `--variant-*`, `--size-*`, `--selectable`, `--empty`; элементы
`__items`, `__group`, `__group-label`, `__group-items`, `__status`, `__spinner`, `__empty`)
и `nui-list-item` (`--size-*`, `--mode-*`, `--selected`, `--active`, `--disabled`; элементы
`__inner`, `__action`; строка — общий блок `nui-row` с `__leading`, `__body`, `__title`,
`__description`, `__trailing`, `__check`; переменные `--_divider`, `--_padding-inline`,
`--_padding-block`, `--_gap`, `--_min-size`, `--_hover`).
