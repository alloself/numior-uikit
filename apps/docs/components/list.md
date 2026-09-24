# Список

`NuiList` — семантический `ul`/`ol` (`as`) с вариантами `plain`, `divided`, `bordered` и
пунктами `NuiListItem`: слоты `leading`, `default`, `description`, `trailing` или пропы
`title`, `description`, `icon`. Пункт с `href`/`to` становится ссылкой, с `@click` или
`interactive` — кнопкой. Проп `items` рисует те же пункты из данных, а пустой массив
показывает [пустое состояние](/components/empty). Режим `selectable` (`single` или
`multiple`) превращает список в `role="listbox"` с `v-model`, клавиатурой и typeahead.

<script setup>
import { ref } from 'vue'
const picked = ref(['go'])
const channel = ref('push')
const languages = [
  { title: 'Go', value: 'go' },
  { title: 'Rust', value: 'rust' },
  { title: 'Ruby', value: 'ruby', disabled: true },
  { title: 'Котлин', value: 'kotlin' },
]
const links = [
  { title: 'Документация', description: 'Руководства и API', href: '#docs', icon: 'file' },
  { title: 'Репозиторий', href: '#repo', icon: 'external-link' },
  { title: 'Запустить проверку', description: 'Кнопка внутри списка', onClick: () => {} },
]
</script>

<div class="vp-raw nui-demo" data-nui-theme="light" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); align-items: start">
  <NuiList variant="divided" :items="links" />
  <NuiList v-model="picked" selectable="multiple" variant="bordered" label="Языки" :items="languages" />
  <NuiList v-model="channel" selectable="single" variant="bordered" label="Канал">
    <NuiListItem value="email" title="Почта" description="Ежедневный дайджест" icon="inbox" />
    <NuiListItem value="push" title="Push" description="Мгновенно" />
    <NuiListItem value="none" title="Не присылать" />
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
    <NuiListItem title="Документация" description="Руководства и API" href="/docs" icon="file" />
    <NuiListItem title="Профиль" :to="{ name: 'profile' }" :as="RouterLink">
      <template #leading><NuiAvatar :name="user.name" size="sm" /></template>
      <template #trailing><NuiBadge tone="success" dot label="В сети" /></template>
    </NuiListItem>
    <NuiListItem title="Выйти" @click="logout" />
  </NuiList>
  <NuiList v-model="channel" selectable="single" label="Канал" :items="channels" />
</template>
```

## Поведение

В обычном режиме список не перехватывает клавиатуру: ссылки и кнопки пунктов доступны по
Tab как есть. В режиме `selectable` пункты с `value` получают `role="option"`, фокус
двигается стрелками, Home/End и набором первых букв (`useListNavigation`), в Tab-порядке
остаётся один пункт — выбранный или первый. Enter и Space выбирают (в `multiple` —
переключают), клик тоже. Пункт без `value` в выбираемом списке остаётся обычным `li`, а
`href`/`@click` у пункта с `value` игнорируются: смешивать выбор и навигацию не нужно.
Объектные значения сравниваются через `getKey`. Выбранный пункт получает фон
`--nui-primary-soft`, а заголовок, иконки и галочка — цвет `--nui-primary-soft-foreground`.

## Доступность

Статический список — `ul`/`ol` с `li`; ссылки — `NuiLink`, кнопки — `<button>`. Выбираемый
список — `role="listbox"` (`aria-multiselectable` для `multiple`) с именем из `label`,
пункты — `role="option"` с `aria-selected`, отключённые — `aria-disabled`. Один tab stop
детерминирован уже на сервере.

## API

| Prop         | Тип                                  | По умолчанию | Описание                                  |
| ------------ | ------------------------------------ | ------------ | ----------------------------------------- |
| `as`         | `'ul' \| 'ol'`                       | `'ul'`       | Тег списка                                |
| `variant`    | `'plain' \| 'divided' \| 'bordered'` | `'plain'`    | Разделители и рамка                       |
| `size`       | `'sm' \| 'md' \| 'lg'`               | `'md'`       | Высота строки (токены контролов)          |
| `items`      | `NuiListEntry<T>[]`                  | —            | Пункты из данных; `[]` — пустое состояние |
| `selectable` | `'single' \| 'multiple'`             | —            | Режим выбора                              |
| `modelValue` | `T \| T[]`                           | —            | Выбор (`v-model`)                         |
| `getKey`     | `(value: T) => string`               | —            | Ключ объектных значений                   |
| `loop`       | `boolean`                            | `true`       | Циклические стрелки                       |
| `typeahead`  | `boolean`                            | `true`       | Поиск по первым буквам                    |
| `label`      | `string`                             | —            | Имя списка                                |
| `emptyLabel` | `string`                             | `'No items'` | Заголовок пустого состояния               |
| `linkAs`     | `string \| Component`                | `'a'`        | Компонент роутера для пунктов из `items`  |

`NuiListItem`: `value`, `title`, `description`, `icon`, `href`, `to`, `as`, `interactive`,
`disabled`; слоты `leading`, `default`, `description`, `trailing`. Слоты списка: `item`
(`{ item, selected }`) для пунктов из `items`, `empty`. Блоки `nui-list` (модификаторы
`--variant-*`, `--size-*`, `--selectable`, `--empty`) и `nui-list-item` (`--size-*`, `--mode-*`,
`--selected`, `--disabled`; элементы `__inner`, `__action`, `__leading`, `__body`, `__title`,
`__description`, `__trailing`, `__check`; переменные `--_divider`, `--_padding-inline`,
`--_min-size`, `--_hover`).
