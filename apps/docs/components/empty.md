# Пустое состояние

`NuiEmpty` объясняет, почему на месте данных ничего нет, и предлагает действие: иконка
(`icon`, по умолчанию `inbox`, отключается `hideIcon`) или слот `media` с иллюстрацией,
`title`, `description` и слот `actions`. `size="sm"` — компактный вариант для встраивания в
списки, таблицы и выпадающие списки: его показывают [список](/components/list) с пустыми
`items`, а также `NuiSelect` и `NuiCombobox` без совпадений.

<div class="nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiEmpty title="Пока пусто" description="Создайте первый проект, чтобы увидеть его здесь.">
    <template #actions>
      <NuiButton size="sm">Создать проект</NuiButton>
      <NuiButton size="sm" variant="ghost" tone="neutral">Импортировать</NuiButton>
    </template>
  </NuiEmpty>
  <NuiEmpty size="sm" icon="search" title="Ничего не найдено" description="Попробуйте другой запрос" />
  <NuiEmpty size="sm" hide-icon title="Нет вариантов" />
</div>

```vue
<script setup lang="ts">
import { NuiEmpty } from '@numior/vue';
import '@numior/vue/styles/empty.css';
</script>

<template>
  <NuiEmpty title="Пока пусто" description="Создайте первый проект, чтобы увидеть его здесь.">
    <template #actions><NuiButton size="sm" @click="create">Создать проект</NuiButton></template>
  </NuiEmpty>
</template>
```

## Доступность

Заголовок — `<p>`, а не heading: пустое состояние живёт внутри секции и не должно ломать
порядок заголовков. Иконка декоративна; смысл несёт текст, поэтому `title` или
`description` обязателен. Кнопки в `actions` — обычные `NuiButton`.

## API

| Prop          | Тип            | По умолчанию | Описание                                  |
| ------------- | -------------- | ------------ | ----------------------------------------- |
| `icon`        | `IconAlias`    | `'inbox'`    | Иконка                                    |
| `hideIcon`    | `boolean`      | `false`      | Без иконки (слот `media` всё равно виден) |
| `title`       | `string`       | —            | Заголовок                                 |
| `description` | `string`       | —            | Пояснение                                 |
| `size`        | `'sm' \| 'md'` | `'md'`       | Отступы и размер иконки                   |

Слоты `media`, `title`, `default` (описание), `actions`. Блок `nui-empty`, модификатор
`--size-*`; элементы `__media`, `__icon`, `__title`, `__description`, `__actions`; переменные
`--_padding`, `--_gap`, `--_media-size`, `--_title-size`.
