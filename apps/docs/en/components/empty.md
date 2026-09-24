# Empty state

`NuiEmpty` explains why there is nothing where data should be and offers an action: an icon
(`icon`, `inbox` by default, removed by `hideIcon`) or a `media` slot with an illustration,
`title`, `description` and an `actions` slot. `size="sm"` is the compact variant for lists,
tables and dropdowns: the [list](/en/components/list) shows it for empty `items`, and
`NuiSelect` and `NuiCombobox` show it when nothing matches.

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiEmpty title="Nothing here yet" description="Create your first project to see it here.">
    <template #actions>
      <NuiButton size="sm">Create project</NuiButton>
      <NuiButton size="sm" variant="ghost" tone="neutral">Import</NuiButton>
    </template>
  </NuiEmpty>
  <NuiEmpty size="sm" icon="search" title="No results" description="Try another query" />
  <NuiEmpty size="sm" hide-icon title="No options" />
</div>

```vue
<script setup lang="ts">
import { NuiEmpty } from '@numior/vue';
import '@numior/vue/styles/empty.css';
</script>

<template>
  <NuiEmpty title="Nothing here yet" description="Create your first project to see it here.">
    <template #actions><NuiButton size="sm" @click="create">Create project</NuiButton></template>
  </NuiEmpty>
</template>
```

## Accessibility

The title is a `<p>`, not a heading: an empty state lives inside a section and must not
break the heading order. The icon is decorative; the text carries the meaning, so `title` or
`description` is required. Buttons in `actions` are regular `NuiButton`s.

## API

| Prop          | Type           | Default   | Description                               |
| ------------- | -------------- | --------- | ----------------------------------------- |
| `icon`        | `IconAlias`    | `'inbox'` | Icon                                      |
| `hideIcon`    | `boolean`      | `false`   | No icon (the `media` slot is still shown) |
| `title`       | `string`       | —         | Title                                     |
| `description` | `string`       | —         | Explanation                               |
| `size`        | `'sm' \| 'md'` | `'md'`    | Spacing and icon size                     |

Slots `media`, `title`, `default` (description), `actions`. Block `nui-empty`, modifier
`--size-*`; elements `__media`, `__icon`, `__title`, `__description`, `__actions`; variables
`--_padding`, `--_gap`, `--_media-size`, `--_title-size`.
