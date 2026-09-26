# Pagination

`NuiPagination` is a `<nav>` of page controls: boundaries, siblings of the current page and
ellipses between them, previous/next and optionally first/last. Next to it sit the range
caption "1–20 of 240" and, when `pageSizes` is set, a page-size `NuiSelect`. `href` turns the
buttons into links for SEO and routers, and on narrow containers the page numbers collapse
into a "3 / 12" status.

<script setup>
import { ref } from 'vue'
const page = ref(6)
const pageSize = ref(20)
const linkPage = ref(2)
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiPagination v-model:page="page" v-model:page-size="pageSize" :total="240" :page-sizes="[10, 20, 50]" />
  <NuiPagination :page="linkPage" :total="60" :show-range="false" :href="(p) => `#page-${p}`" label="Linked pages" @update:page="linkPage = $event" />
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
  />
</template>
```

## Behavior

- `siblings` and `boundaries` decide how many pages show around the current one and at the
  edges; when every page fits there are no ellipses. The page is always clamped to
  `1…pageCount`, and changing the page size recomputes the current page.
- Without `href` the items are buttons and navigation changes `v-model:page`. With
  `href(page)` they are `NuiLink`s (a router component through `as`) and the model updates on
  click.
- The compact mode depends on the component's own width (`@container`), not the window:
  previous, the status and next remain.

## Accessibility

`<nav aria-label>` with a `<ul>`; the current page carries `aria-current="page"`, every page
button is named by `pageLabel`, arrows by `previousLabel`/`nextLabel` and
`firstLabel`/`lastLabel`. Unavailable arrows are disabled. Arrows mirror in RTL.

## API

| Prop               | Type                          | Default                                                       | Description                   |
| ------------------ | ----------------------------- | ------------------------------------------------------------- | ----------------------------- |
| `v-model:page`     | `number`                      | `1`                                                           | Current page                  |
| `v-model:pageSize` | `number`                      | `20`                                                          | Page size                     |
| `total`            | `number`                      | —                                                             | Total items                   |
| `siblings`         | `number`                      | `1`                                                           | Pages on each side of current |
| `boundaries`       | `number`                      | `1`                                                           | Pages at each edge            |
| `edges`            | `boolean`                     | `false`                                                       | First and last controls       |
| `href`             | `(page: number) => string`    | —                                                             | Links instead of buttons      |
| `as`               | `string \| Component`         | `'a'`                                                         | Link component for a router   |
| `pageSizes`        | `number[]`                    | —                                                             | Page-size choices             |
| `showRange`        | `boolean`                     | `true`                                                        | Range caption                 |
| `size`             | `NuiSize`                     | `'md'`                                                        | Control size                  |
| `label`            | `string`                      | [dictionary](/en/localization#pagination): “Pagination”       | `aria-label` of the nav       |
| `pageLabel`        | `(page: number) => string`    | [dictionary](/en/localization#pagination): “Page N”           | Page button name              |
| `rangeLabel`       | `(from, to, total) => string` | [dictionary](/en/localization#pagination): “from–to of total” | Range caption                 |

Plus `previousLabel`, `nextLabel`, `firstLabel`, `lastLabel`, `pageSizeLabel`, all from the
[dictionary](/en/localization#pagination). Block
`nui-pagination` (modifier `--size-*`; elements `__range`, `__page-size`, `__page-size-label`,
`__select`, `__list`, `__item` with `--page`, `--ellipsis`, `--edge`, `--status`, `__control` with
`--current`, `__previous`, `__next`, `__page`, `__arrow`, `__ellipsis`, `__status`).
