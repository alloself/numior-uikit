# Пагинация

`NuiPagination` — `<nav>` с кнопками страниц: границы, соседи текущей страницы и многоточия
между ними, кнопки «назад»/«вперёд» и по желанию «в начало»/«в конец». Рядом — строка
диапазона «1–20 из 240» и, если задан `pageSizes`, выбор размера страницы через
`NuiSelect`. `href` переключает кнопки на ссылки для SEO и роутеров, а на узких контейнерах
номера страниц сворачиваются в статус «3 / 12».

<script setup>
import { ref } from 'vue'
const page = ref(6)
const pageSize = ref(20)
const linkPage = ref(2)
</script>

<div class="nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiPagination v-model:page="page" v-model:page-size="pageSize" :total="240" :page-sizes="[10, 20, 50]" label="Страницы" previous-label="Предыдущая" next-label="Следующая" page-size-label="На странице" :page-label="(p) => `Страница ${p}`" :range-label="(from, to, total) => `${from}–${to} из ${total}`" />
  <NuiPagination :page="linkPage" :total="60" :show-range="false" :href="(p) => `#page-${p}`" label="По ссылкам" previous-label="Предыдущая" next-label="Следующая" :page-label="(p) => `Страница ${p}`" @update:page="linkPage = $event" />
</div>

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { NuiPagination } from '@numior/vue';

const page = ref(1);
const pageSize = ref(20);
</script>

<template>
  <NuiPagination
    v-model:page="page"
    v-model:page-size="pageSize"
    :total="240"
    :page-sizes="[10, 20, 50]"
    label="Страницы"
    previous-label="Предыдущая"
    next-label="Следующая"
    page-size-label="На странице"
    :page-label="(p) => `Страница ${p}`"
    :range-label="(from, to, total) => `${from}–${to} из ${total}`"
  />
</template>
```

## Поведение

- `siblings` и `boundaries` задают, сколько страниц видно вокруг текущей и у краёв; когда
  страниц не больше, чем помещается, многоточий нет. Страница всегда зажата в
  `1…pageCount`, при смене размера страницы текущая страница пересчитывается.
- Без `href` элементы — кнопки, и переход меняет `v-model:page`. С `href(page)` они —
  `NuiLink` (через `as` — компонент роутера), а модель обновляется по клику.
- Компактный режим включается по ширине самого компонента (`@container`), а не окна:
  остаются «назад», статус и «вперёд».

## Доступность

`<nav aria-label>` с `<ul>`; текущая страница помечена `aria-current="page"`, у каждой
кнопки есть имя из `pageLabel`, у стрелок — из `previousLabel`/`nextLabel` и
`firstLabel`/`lastLabel`. Недоступные стрелки отключены. Стрелки зеркалятся в RTL.

## API

| Prop               | Тип                           | По умолчанию       | Описание                         |
| ------------------ | ----------------------------- | ------------------ | -------------------------------- |
| `v-model:page`     | `number`                      | `1`                | Текущая страница                 |
| `v-model:pageSize` | `number`                      | `20`               | Размер страницы                  |
| `total`            | `number`                      | —                  | Всего элементов                  |
| `siblings`         | `number`                      | `1`                | Страниц с каждой стороны текущей |
| `boundaries`       | `number`                      | `1`                | Страниц у каждого края           |
| `edges`            | `boolean`                     | `false`            | Кнопки «в начало» и «в конец»    |
| `href`             | `(page: number) => string`    | —                  | Ссылки вместо кнопок             |
| `as`               | `string \| Component`         | `'a'`              | Компонент ссылки для роутера     |
| `pageSizes`        | `number[]`                    | —                  | Выбор размера страницы           |
| `showRange`        | `boolean`                     | `true`             | Строка диапазона                 |
| `size`             | `NuiSize`                     | `'md'`             | Размер контролов                 |
| `label`            | `string`                      | `'Pagination'`     | `aria-label` навигации           |
| `pageLabel`        | `(page: number) => string`    | `Page N`           | Имя кнопки страницы              |
| `rangeLabel`       | `(from, to, total) => string` | `from–to of total` | Строка диапазона                 |

А также `previousLabel`, `nextLabel`, `firstLabel`, `lastLabel`, `pageSizeLabel`. Блок
`nui-pagination` (модификатор `--size-*`; элементы `__range`, `__page-size`, `__page-size-label`,
`__select`, `__list`, `__item` с `--page`, `--ellipsis`, `--edge`, `__control` с `--current`,
`__previous`, `__next`, `__page`, `__arrow`, `__ellipsis`, `__status`).
