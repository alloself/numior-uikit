# List

`NuiList` is a semantic `ul`/`ol` (`as`) with the variants `plain`, `divided` and `bordered`
and `NuiListItem` items: the slots `leading`, `default`, `description`, `trailing` or the
props `title`, `description`, `icon`. An item with `href`/`to` becomes a link, one with
`@click` or `interactive` a button. The `items` prop renders the same items from data, and
an empty array shows the [empty state](/en/components/empty). The `selectable` mode
(`single` or `multiple`) turns the list into a `role="listbox"` with `v-model`, keyboard
navigation and typeahead.

<script setup>
import { ref } from 'vue'
const picked = ref(['go'])
const channel = ref('push')
const languages = [
  { title: 'Go', value: 'go' },
  { title: 'Rust', value: 'rust' },
  { title: 'Ruby', value: 'ruby', disabled: true },
  { title: 'Kotlin', value: 'kotlin' },
]
const links = [
  { title: 'Documentation', description: 'Guides and API', href: '#docs', icon: 'file' },
  { title: 'Repository', href: '#repo', icon: 'external-link' },
  { title: 'Run checks', description: 'A button inside the list', onClick: () => {} },
]
</script>

<div class="vp-raw nui-demo" data-nui-theme="light" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); align-items: start">
  <NuiList variant="divided" :items="links" />
  <NuiList v-model="picked" selectable="multiple" variant="bordered" label="Languages" :items="languages" />
  <NuiList v-model="channel" selectable="single" variant="bordered" label="Channel">
    <NuiListItem value="email" title="Email" description="Daily digest" icon="inbox" />
    <NuiListItem value="push" title="Push" description="Instant" />
    <NuiListItem value="none" title="Do not send" />
  </NuiList>
  <NuiList :items="[]" variant="bordered" empty-label="No tasks" />
</div>

```vue
<script setup lang="ts">
import { NuiList, NuiListItem } from '@numior/vue';
import '@numior/vue/styles/list.css';
</script>

<template>
  <NuiList variant="divided">
    <NuiListItem title="Documentation" description="Guides and API" href="/docs" icon="file" />
    <NuiListItem title="Profile" :to="{ name: 'profile' }" :as="RouterLink">
      <template #leading><NuiAvatar :name="user.name" size="sm" /></template>
      <template #trailing><NuiBadge tone="success" dot label="Online" /></template>
    </NuiListItem>
    <NuiListItem title="Sign out" @click="logout" />
  </NuiList>
  <NuiList v-model="channel" selectable="single" label="Channel" :items="channels" />
</template>
```

## Behaviour

In the plain mode the list does not intercept the keyboard: item links and buttons are
reachable by Tab as they are. In the `selectable` mode items with a `value` get
`role="option"`, focus moves with the arrows, Home/End and typing the first letters
(`useListNavigation`), and one item stays in the Tab order, the selected one or the first.
Enter and Space select (toggle in `multiple`), and so does a click. An item without a `value`
inside a selectable list stays a plain `li`, and `href`/`@click` of an item with a `value`
are ignored: selection and navigation are not meant to mix. Object values are compared
through `getKey`. A selected item gets the `--nui-primary-soft` background while its title,
icons and check take `--nui-primary-soft-foreground`.

## Accessibility

A static list is a `ul`/`ol` with `li`; links are `NuiLink`, buttons are `<button>`. A
selectable list is a `role="listbox"` (`aria-multiselectable` for `multiple`) named by
`label`, items are `role="option"` with `aria-selected`, disabled ones carry
`aria-disabled`. The single tab stop is deterministic already on the server.

## API

| Prop         | Type                                 | Default      | Description                                 |
| ------------ | ------------------------------------ | ------------ | ------------------------------------------- |
| `as`         | `'ul' \| 'ol'`                       | `'ul'`       | List tag                                    |
| `variant`    | `'plain' \| 'divided' \| 'bordered'` | `'plain'`    | Dividers and border                         |
| `size`       | `'sm' \| 'md' \| 'lg'`               | `'md'`       | Row height (control tokens)                 |
| `items`      | `NuiListEntry<T>[]`                  | —            | Items from data; `[]` shows the empty state |
| `selectable` | `'single' \| 'multiple'`             | —            | Selection mode                              |
| `modelValue` | `T \| T[]`                           | —            | Selection (`v-model`)                       |
| `getKey`     | `(value: T) => string`               | —            | Key of object values                        |
| `loop`       | `boolean`                            | `true`       | Arrows wrap around                          |
| `typeahead`  | `boolean`                            | `true`       | Search by first letters                     |
| `label`      | `string`                             | —            | Name of the list                            |
| `emptyLabel` | `string`                             | `'No items'` | Title of the empty state                    |
| `linkAs`     | `string \| Component`                | `'a'`        | Router component for `items` entries        |

`NuiListItem`: `value`, `title`, `description`, `icon`, `href`, `to`, `as`, `interactive`,
`disabled`; slots `leading`, `default`, `description`, `trailing`. List slots: `item`
(`{ item, selected }`) for `items` entries and `empty`. Blocks `nui-list` (modifiers
`--variant-*`, `--size-*`, `--selectable`, `--empty`) and `nui-list-item` (`--size-*`,
`--mode-*`, `--selected`, `--disabled`; elements `__inner`, `__action`, `__leading`, `__body`,
`__title`, `__description`, `__trailing`, `__check`; variables `--_divider`,
`--_padding-inline`, `--_min-size`, `--_hover`).
