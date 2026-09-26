# List

`NuiList` is a semantic `ul`/`ol` (`as`) with the variants `plain`, `divided`, `bordered`,
`floating` and `nav` and `NuiListItem` items: the slots `leading`, `default`, `description`,
`trailing` or the props `label`, `description`, `icon`. An item with `href`/`to` becomes a
link, one with `@click` or `interactive` a button. The `items` prop renders the same items
from data, accepts groups `{ label, items }`, and an empty array shows the
[empty state](/en/components/empty). The `selectable` mode (`single` or `multiple`) turns the
list into a `role="listbox"` with `v-model`, keyboard navigation and typeahead. The same
component in its `floating` variant is the dropdown of `NuiSelect`, `NuiCombobox` and
`NuiTimeField`: the kit has no second option list.

<script setup>
import { ref } from 'vue'
const picked = ref(['go'])
const channel = ref('push')
const languages = [
  { label: 'Go', value: 'go' },
  { label: 'Rust', value: 'rust' },
  { label: 'Ruby', value: 'ruby', disabled: true },
  { label: 'Kotlin', value: 'kotlin' },
]
const sections = [
  { label: 'Inbox', href: '#inbox', icon: 'inbox', current: true, badge: 3 },
  { label: 'Calendar', href: '#calendar', icon: 'calendar' },
  { label: 'Files', href: '#files', icon: 'folder-open', badge: 'new' },
]
const links = [
  {
    label: 'Links',
    items: [
      { label: 'Documentation', description: 'Guides and API', href: '#docs', icon: 'file' },
      { label: 'Repository', href: '#repo', icon: 'external-link' },
    ],
  },
  {
    label: 'Actions',
    items: [{ label: 'Run checks', description: 'A button inside the list', onClick: () => {} }],
  },
]
</script>

<div class="vp-raw nui-demo" data-nui-theme="light" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); align-items: start">
  <NuiList variant="divided" :items="links" />
  <NuiList v-model:values="picked" selectable="multiple" variant="bordered" label="Languages" :items="languages" />
  <NuiList v-model="channel" selectable="single" variant="bordered" label="Channel">
    <NuiListItem value="email" label="Email" description="Daily digest" icon="inbox" />
    <NuiListItem value="push" label="Push" description="Instant" />
    <NuiListItem value="none" label="Do not send" />
  </NuiList>
  <NuiList :items="[]" variant="bordered" empty-label="No tasks" />
  <NuiList variant="nav" label="Sections" :items="sections" />
</div>

```vue
<script setup lang="ts">
import { NuiList, NuiListItem } from '@numior/vue';
import '@numior/vue/styles/list.css';
</script>

<template>
  <NuiList variant="divided">
    <NuiListItem label="Documentation" description="Guides and API" href="/docs" icon="file" />
    <NuiListItem label="Profile" :to="{ name: 'profile' }" :as="RouterLink">
      <template #leading><NuiAvatar :name="user.name" size="sm" /></template>
      <template #trailing><NuiBadge tone="success" dot label="Online" /></template>
    </NuiListItem>
    <NuiListItem label="Sign out" @click="logout" />
  </NuiList>
  <NuiList v-model="channel" selectable="single" label="Channel" :items="channels" />
  <NuiList
    variant="bordered"
    :items="[
      { label: 'Links', items: [{ label: 'Documentation', href: '/docs' }] },
      { label: 'Actions', items: [{ label: 'Sign out', onClick: logout }] },
    ]"
  />
</template>
```

The `nav` variant renders compact rounded navigation rows without dividers; the
[sidebar](/en/components/layout) is built on it. The `current` prop marks the current page:
`aria-current="page"` on the link or button and a `--nui-primary-soft` background. The
`badge` prop shows a `NuiBadge` at the end of the row (a number becomes a count capped at
`99+`), and the `nested` slot renders content inside the `li` below the row at its full
width, such as a nested list. `items` entries understand the same `current` and `badge`.

Groups `{ label, items }` render a `nui-list__group-label` section heading, indent their
items by `--_indent` (smaller in the floating list) and separate groups with a divider. In a
selectable list the group gets `role="group"` named by that caption and option ids stay
sequential, so select and combobox navigate across groups without extra logic.

## Behaviour

In the plain mode the list does not intercept the keyboard: item links and buttons are
reachable by Tab as they are. In the `selectable` mode items with a `value` get
`role="option"`, focus moves with the arrows, Home/End and typing the first letters
(`useListNavigation`), and one item stays in the Tab order, the selected one or the first.
Enter and Space select (toggle in `multiple`), and so does a click. An item without a `value`
inside a selectable list stays a plain `li`, and `href`/`@click` of an item with a `value`
are ignored: selection and navigation are not meant to mix. Object values are compared
through `getKey`. A selected item gets the `--nui-primary-soft` background while its title,
icons and check take `--nui-primary-soft-foreground`; the check sits at the inline end so the
text never shifts. The `select(item)` event fires on every pick of an `items` entry. An owner
that drives the keyboard itself (select, combobox) passes `keyboard=false`, highlights the
active item through `activeId` and shows loading through `loading`.

## Accessibility

A static list is a `ul`/`ol` with `li`; links are `NuiLink`, buttons are `<button>`. A
selectable list is a `role="listbox"` (`aria-multiselectable` for `multiple`) named by
`label`, items are `role="option"` with `aria-selected`, disabled ones carry
`aria-disabled`. The single tab stop is deterministic already on the server.

## API

| Prop           | Type                                                        | Default                                         | Description                                                     |
| -------------- | ----------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------- |
| `id`           | `string`                                                    | generated                                       | Root id and the base of item ids                                |
| `as`           | `'ul' \| 'ol'`                                              | `'ul'`                                          | List tag                                                        |
| `variant`      | `'plain' \| 'divided' \| 'bordered' \| 'floating' \| 'nav'` | `'plain'`                                       | Dividers, border, a floating surface or navigation              |
| `size`         | `'sm' \| 'md' \| 'lg'`                                      | `'md'`                                          | Row height (control tokens)                                     |
| `items`        | `NuiListSource<E>`                                          | —                                               | Items and `{ label, items }` groups; `[]` shows the empty state |
| `selectable`   | `'single' \| 'multiple'`                                    | —                                               | Selection mode                                                  |
| `modelValue`   | `T \| null`                                                 | `null`                                          | Value in single mode (`v-model`)                                |
| `values`       | `T[]`                                                       | `[]`                                            | Values in `multiple` (`v-model:values`)                         |
| `getKey`       | `(value: T) => string`                                      | —                                               | Key of object values                                            |
| `loop`         | `boolean`                                                   | `true`                                          | Arrows wrap around                                              |
| `typeahead`    | `boolean`                                                   | `true`                                          | Search by first letters                                         |
| `keyboard`     | `boolean`                                                   | `true`                                          | `false` lets the owner drive the keyboard                       |
| `activeId`     | `string`                                                    | —                                               | Id of the virtually focused item                                |
| `loading`      | `boolean`                                                   | `false`                                         | Loading row instead of the empty state                          |
| `loadingLabel` | `string`                                                    | [dictionary](/en/localization#list): “Loading”  | Loading label                                                   |
| `label`        | `string`                                                    | —                                               | Name of the list                                                |
| `labelledBy`   | `string`                                                    | —                                               | Id of an external label                                         |
| `emptyLabel`   | `string`                                                    | [dictionary](/en/localization#list): “No items” | Title of the empty state                                        |
| `linkAs`       | `string \| Component`                                       | `'a'`                                           | Router component for `items` entries                            |

`NuiListItem`: `value`, `id`, `label`, `description`, `icon`, `href`, `to`, `as`,
`interactive`, `disabled`, `current`, `badge`; slots `leading`, `default` (`{ selected, active }`),
`description`, `trailing`, `nested`; a template ref exposes `action`, the link or button element. List slots:
`item` (`{ item, selected, active }`) for `items` entries and `empty`; event `select(item)`.
Blocks `nui-list` (modifiers `--variant-*`, `--size-*`, `--selectable`, `--empty`; elements
`__items`, `__group`, `__group-label`, `__group-items`, `__status`, `__spinner`, `__empty`)
and `nui-list-item` (`--size-*`, `--mode-*`, `--selected`, `--active`, `--current`, `--disabled`; elements
`__inner`, `__action`; the row is the shared `nui-row` block with `__leading`, `__body`,
`__title`, `__description`, `__trailing`, `__check`; variables `--_divider`,
`--_padding-inline`, `--_padding-block`, `--_gap`, `--_min-size`, `--_hover`).
