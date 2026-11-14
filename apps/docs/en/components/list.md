# List

Rows with an icon, a label and a short description.

<Example name="list/Basic" />

Describe the rows with `NuiListItem` parts or pass them in `items`. A row with `href` or `to`
becomes a link, and a row with `interactive` a button.

## Installation

```ts
import { NuiList, NuiListItem } from '@numior/vue';
import '@numior/vue/styles/list.css';
```

## Usage

Change the look and the row size, then turn on picking one or several teammates.

<Configurator name="NuiList" />

## Examples

### Pick one or several values

Set `selectable` to `single` or `multiple`.

<Example name="list/Selectable" />

One value comes through `v-model`, several through `v-model:values`. A disabled row stays in view
but cannot be picked.

### Build a section menu

Set `variant="nav"` and mark the open section with `current`.

<Example name="list/Nav" />

The [Sidebar](/en/components/sidebar) menu is made of the same rows. A row shows a counter in
`badge` and a key combination in `shortcut`.

### Split into groups

Pass groups shaped as `{ label, items }` in `items`.

<Example name="list/Groups" />

The arrow keys move through the rows of every group as through one list.

## Behavior

In a regular list, Tab moves through the links and buttons as anywhere on the page. A selectable
list is a single Tab stop, and the arrow keys or the first letters of a label move between rows.

[Select](/en/components/select) and [Combobox](/en/components/combobox) open the same list with
the `floating` variant.

<KeyboardReference name="NuiList" />

## API

<ApiReference :names="['NuiList', 'NuiListItem']" />
