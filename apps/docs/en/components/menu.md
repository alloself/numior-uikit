# Menu

`NuiMenu` is a dropdown menu on a native `popover="auto"` with `role="menu"`. The trigger
comes through a slot with `attrs` (as in the popover) and the items are composed from parts:
`NuiMenuItem`, `NuiMenuCheckboxItem`, `NuiMenuRadioGroup` with `NuiMenuRadioItem`,
`NuiMenuSeparator`, `NuiMenuLabel` and `NuiMenuSub` for submenus. The same set can be
described as data through the `items` prop.

<script setup>
import { ref } from 'vue'
const grid = ref(true)
const sort = ref('name')
const last = ref('')
const entries = [
  { label: 'Copy', shortcut: '⌘C', onSelect: () => (last.value = 'copy') },
  { type: 'separator' },
  { type: 'label', label: 'Export' },
  { type: 'sub', label: 'Download as', items: [
    { label: 'PDF', onSelect: () => (last.value = 'pdf') },
    { label: 'CSV', onSelect: () => (last.value = 'csv') },
  ] },
]
</script>

<div class="nui-demo" data-nui-theme="light">
  <NuiMenu>
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="outline" tone="neutral">Actions</NuiButton>
    </template>
    <NuiMenuItem icon="check" shortcut="⌘R" @select="last = 'rename'">Rename</NuiMenuItem>
    <NuiMenuItem href="#docs">Documentation</NuiMenuItem>
    <NuiMenuItem disabled>Archive</NuiMenuItem>
    <NuiMenuSeparator />
    <NuiMenuLabel>View</NuiMenuLabel>
    <NuiMenuCheckboxItem v-model:checked="grid">Grid</NuiMenuCheckboxItem>
    <NuiMenuRadioGroup v-model="sort">
      <NuiMenuRadioItem value="name">By name</NuiMenuRadioItem>
      <NuiMenuRadioItem value="date">By date</NuiMenuRadioItem>
    </NuiMenuRadioGroup>
    <NuiMenuSeparator />
    <NuiMenuSub label="Share">
      <NuiMenuItem @select="last = 'email'">Email</NuiMenuItem>
      <NuiMenuItem @select="last = 'link'">Link</NuiMenuItem>
    </NuiMenuSub>
    <NuiMenuItem tone="error" @select="last = 'delete'">Delete</NuiMenuItem>
  </NuiMenu>
  <NuiMenu :items="entries" placement="bottom-end">
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="ghost" tone="neutral" aria-label="More"><NuiIcon alias="ellipsis" /></NuiButton>
    </template>
  </NuiMenu>
  <span class="nui-text-muted">Last: {{ last || '—' }}, grid: {{ grid }}, sort: {{ sort }}</span>
</div>

```vue
<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiButton,
  NuiMenu,
  NuiMenuCheckboxItem,
  NuiMenuItem,
  NuiMenuLabel,
  NuiMenuRadioGroup,
  NuiMenuRadioItem,
  NuiMenuSeparator,
  NuiMenuSub,
} from '@numior/vue';

const grid = ref(true);
const sort = ref('name');
</script>

<template>
  <NuiMenu>
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="outline" tone="neutral">Actions</NuiButton>
    </template>
    <NuiMenuItem icon="check" shortcut="⌘R" @select="rename">Rename</NuiMenuItem>
    <NuiMenuItem href="/docs">Documentation</NuiMenuItem>
    <NuiMenuSeparator />
    <NuiMenuLabel>View</NuiMenuLabel>
    <NuiMenuCheckboxItem v-model:checked="grid">Grid</NuiMenuCheckboxItem>
    <NuiMenuRadioGroup v-model="sort">
      <NuiMenuRadioItem value="name">By name</NuiMenuRadioItem>
      <NuiMenuRadioItem value="date">By date</NuiMenuRadioItem>
    </NuiMenuRadioGroup>
    <NuiMenuSub label="Share">
      <NuiMenuItem @select="share('email')">Email</NuiMenuItem>
      <NuiMenuItem @select="share('link')">Link</NuiMenuItem>
    </NuiMenuSub>
    <NuiMenuItem tone="error" @select="remove">Delete</NuiMenuItem>
  </NuiMenu>
</template>
```

## Data instead of parts

`items` takes an array of entries: `{ label, icon?, shortcut?, disabled?, tone?, href?, to?, as?, closeOnSelect?, onSelect }`,
`{ type: 'checkbox', label, checked, onCheckedChange }`, `{ type: 'radio-group', value, onChange, items }`,
`{ type: 'separator' }`, `{ type: 'label', label }` and `{ type: 'sub', label, items }`. Entries render
through the same parts, so styling and behaviour match; the default slot can be combined
with `items`.

## Behavior

- Trigger: a click opens the menu, ArrowDown or Enter/Space open it with focus on the first
  item, ArrowUp on the last. A menu opened with the pointer focuses the container, not an item.
- Inside: arrows loop, Home/End, typeahead on first letters, Escape closes the top level, Tab
  closes everything. Hovering moves focus to the item; when the pointer leaves the menu the
  highlight is dropped.
- An item closes the menu after selection; `closeOnSelect="false"` on the item or the menu
  keeps it open. Checkbox items stay open by default, radio items close.
- A submenu opens on hover after 100 ms and closes 300 ms after the pointer leaves, and on
  ArrowRight/Enter/Space on its item; ArrowLeft returns focus to the item (arrows mirror in
  RTL). A submenu is a nested native popover: a click outside closes the whole chain, a click
  in the parent closes only the submenu.
- On close, focus returns to the trigger when it was inside the menu; this is explicit
  because Safari does not focus buttons on click.

## Accessibility

The content is `role="menu"` labelled by the trigger through `aria-labelledby` (or by
`aria-label` via `label`); the trigger gets `aria-haspopup="menu"`, `aria-expanded` and
`aria-controls`. Items are native buttons with `role="menuitem"`, `menuitemcheckbox`
(`aria-checked`) and `menuitemradio`; an item with `href` or `to` is a `NuiLink` with
`role="menuitem"`. Disabled items stay in the DOM with `aria-disabled` and are skipped by
navigation.

## API

`NuiMenu`: `v-model:open`, `id`, `placement` (`'bottom-start'`), `offset` (`4`), `items`,
`closeOnSelect` (`true`), `loop` (`true`), `typeahead` (`true`), `label`. Slots
`trigger="{ attrs, open }"` and `default`.

`NuiMenuItem`: `icon`, `shortcut`, `disabled`, `tone` (`'neutral' | 'error'`), `closeOnSelect`,
`href`, `to`, `as`; event `select`. `NuiMenuCheckboxItem`: `v-model:checked`, `icon`,
`disabled`, `closeOnSelect` (`false`); event `select`. `NuiMenuRadioGroup`: `v-model`;
`NuiMenuRadioItem`: `value`, `disabled`, `closeOnSelect` (`true`); event `select`.
`NuiMenuSub`: `id`, `label` (or the `label` slot), `icon`, `disabled`, `openDelay` (`100`),
`closeDelay` (`300`); the default slot holds the submenu items.

Blocks `nui-menu` (modifiers `--side-*`, `--sub`), `nui-menu-item` (modifiers `--tone-*`,
`--disabled`, `--checkable`, `--checked`, `--sub`, `--open`; elements `__indicator`, `__dot`,
`__icon`, `__label`, `__shortcut`, `__chevron`; variables `--_tone`, `--_indicator`),
`nui-menu-group`, `nui-menu-separator`, `nui-menu-label`.
