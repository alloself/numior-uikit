# Хлебные крошки

`NuiBreadcrumbs` — `<nav>` с упорядоченным списком ссылок `NuiLink`, где последний элемент
помечен `aria-current="page"`. Разделитель — иконка из реестра (по умолчанию
`chevron-right`, зеркалится в RTL). `maxItems` сворачивает середину длинного пути в кнопку
«…», которая открывает `NuiMenu` со скрытыми ссылками.

<script setup>
const path = [
  { label: 'Главная', href: '#' },
  { label: 'Проекты', href: '#projects' },
  { label: 'Numior', href: '#numior' },
  { label: 'Настройки', href: '#settings' },
  { label: 'Оплата' },
]
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiBreadcrumbs :items="path.slice(0, 3)" label="Путь" />
  <NuiBreadcrumbs :items="path" :max-items="3" label="Полный путь" />
</div>

```vue
<script setup lang="ts">
import { NuiBreadcrumbs, type NuiBreadcrumbItem } from '@numior/vue';

const path: NuiBreadcrumbItem[] = [
  { label: 'Главная', href: '/' },
  { label: 'Проекты', href: '/projects' },
  { label: 'Numior', href: '/projects/numior' },
  { label: 'Настройки', href: '/projects/numior/settings' },
  { label: 'Оплата' },
];
</script>

<template>
  <NuiBreadcrumbs :items="path" :max-items="3" label="Путь" />
</template>
```

## Своя крошка

Слот `item` получает `{ item, index, current }` и заменяет стандартную ссылку или текущий
элемент; разделители и сворачивание остаются за компонентом. Для роутера передайте `as`
и `to` в элементах — они дойдут и до ссылок в меню «…».

```vue
<NuiBreadcrumbs :items="path" :as="RouterLink" v-slot:item="{ item, current }">
  <strong v-if="current">{{ item.label }}</strong>
  <NuiLink v-else :as="RouterLink" :to="item.to" tone="neutral">{{ item.label }}</NuiLink>
</NuiBreadcrumbs>
```

## Доступность

Ориентир `<nav aria-label>` и список `<ol>` дают screen reader'у структуру пути; текущая
страница — не ссылка. Ссылки в крошках выше 24px, чтобы удовлетворять WCAG 2.5.8 как
отдельно стоящие цели. Кнопка «…» — обычная кнопка меню с `aria-haspopup="menu"` и
доступным именем из `moreLabel`.

## API

| Prop        | Тип                              | По умолчанию                                                        | Описание                                   |
| ----------- | -------------------------------- | ------------------------------------------------------------------- | ------------------------------------------ |
| `items`     | `{ label, href?, to?, icon? }[]` | —                                                                   | Путь; последний элемент — текущая страница |
| `maxItems`  | `number`                         | —                                                                   | При превышении середина сворачивается      |
| `separator` | `IconAlias`                      | `'chevron-right'`                                                   | Иконка-разделитель                         |
| `label`     | `string`                         | [словарь](/guide/localization#breadcrumbs): «Навигационная цепочка» | `aria-label` навигации                     |
| `moreLabel` | `string`                         | [словарь](/guide/localization#breadcrumbs): «Показать путь»         | Доступное имя кнопки «…»                   |
| `as`        | `string \| Component`            | `'a'`                                                               | Компонент ссылки для роутера               |

Слот `item="{ item, index, current }"`. Блок `nui-breadcrumbs`, элементы `__list`, `__item`,
`__link`, `__current`, `__icon`, `__separator`, `__more`.
