# List

`NuiList` is a semantic `ul` or `ol` with the `plain`, `divided`, `bordered`, `floating` and
`nav` variants and `NuiListItem` parts. An item with `href` becomes a link, with `interactive` a
button; `selectable` turns the list into a `listbox` with `v-model` and a keyboard.

<Example name="list/Basic" />

## Installation

```ts
import { NuiList, NuiListItem } from '@numior/vue';
import '@numior/vue/styles/list.css';
```

## Examples

### Selecting values

`selectable="multiple"` keeps the selection in `v-model:values`, `single` in `v-model`. Items
from `items` get `role="option"`, disabled ones stay listed.

<Example name="list/Selectable" />

### Navigation

`variant="nav"` gives compact rows without dividers, the ones the sidebar is built on. `current`
marks the current page, `badge` and `shortcut` sit at the end of the row.

<Example name="list/Nav" />

### Groups

`items` takes groups `{ label, items }`: the group heading becomes a labelled `role="group"`,
and navigation runs through every option.

<Example name="list/Groups" />

## Behaviour

In the plain mode the list does not capture the keyboard: links and buttons are reached with Tab
as they are. In a selectable list one item stays in the tab order, arrow keys and typed letters
move the focus. The same list in the `floating` variant is the dropdown of `NuiSelect` and
`NuiCombobox`.

<KeyboardReference name="NuiList" />

## API

<ApiReference :names="['NuiList', 'NuiListItem']" />
