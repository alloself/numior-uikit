# List

`NuiList` is a vertical list of rows: files, contacts, settings, menu entries. Rows come from
`NuiListItem` components or from the `items` array, and each can hold an icon, a label and a
description.

<Example name="list/Basic" />

A row with `href` or `to` works as a link, a row with `interactive` as a button. `variant` picks
the look: `plain`, `divided` with lines between rows, `bordered` in a frame, `floating` for a
dropdown panel and `nav` for a menu.

## Installation

```ts
import { NuiList, NuiListItem } from '@numior/vue';
import '@numior/vue/styles/list.css';
```

## Examples

### Selecting values

With `selectable="single"` the user picks one value, kept in `v-model`. With
`selectable="multiple"` several can be checked, and they are kept in `v-model:values`. Disabled
options stay visible but cannot be selected.

<Example name="list/Selectable" />

### Navigation

`variant="nav"` renders compact rows without lines, the ones the [Sidebar](/en/components/sidebar)
menu is built from. The `current` prop marks the open section, while `badge` and `shortcut` show a
counter and a key combination at the end of the row.

<Example name="list/Nav" />

### Groups

`items` also takes groups shaped as `{ label, items }`: each group gets a heading, such as "Europe"
and "Asia". The arrow keys move through the options of all groups in a row.

<Example name="list/Groups" />

## Behaviour

In a regular list, links and buttons take the focus with Tab like anywhere on the page. In a
selectable list Tab stops on a single row. From there, the arrow keys or the first letters of a
label move the focus.

The same list with the `floating` variant opens in the dropdowns of `NuiSelect` and
`NuiCombobox`.

<KeyboardReference name="NuiList" />

## API

<ApiReference :names="['NuiList', 'NuiListItem']" />
