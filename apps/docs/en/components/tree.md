# Tree

`NuiTree` shows a hierarchy from `items`: expansion in `v-model:expanded`, selection in
`v-model` or `v-model:values`, cascading checkboxes in the same `v-model:values`. The tree
stands on the `NuiList` shell: the same `NuiListItem` rows, the `plain`, `divided` and
`bordered` variants, sizes, badges and shortcuts. Folder and file icons appear on their own,
`virtual` with `height` virtualises long trees.

<Example name="tree/Basic" />

## Installation

```ts
import { NuiTree } from '@numior/vue';
import '@numior/vue/styles/list.css';
import '@numior/vue/styles/tree.css';
```

## Examples

### Variants and row trailers

A node is the same list entry: `badge` and `shortcut` sit at the end of the row. `current`
marks the current node independently of the selection. `variant="bordered"` draws a frame,
`size` changes the row height.

<Example name="tree/Variants" />

### Cascading checkboxes

`checkable` is a multiple selection with checkboxes: a checked node is selected, highlighted
and carries `aria-selected`. Checking a node checks its descendants; ancestors become checked
when every child is checked and mixed when only some are. The model keeps the values in
document order.

<Example name="tree/Checkable" />

### Lazy loading

A `lazy` node without `children` emits `load` when expanded and shows a spinner until the
children arrive. The children of a checked node are checked on their own once they arrive.

<Example name="tree/Lazy" />

### Load failure

When the children never arrive, the application removes the node from `v-model:expanded`:
the spinner stops, and the next expansion emits `load` again. The error message belongs to
the application.

<Example name="tree/LoadError" />

### Virtualisation

`virtual` with `height` renders only the visible window of rows; the row height comes from
`size`, `itemHeight` sets it explicitly. The active row always stays in the DOM, and the
server renders the first 20 rows.

The window sits on a sticky list that the browser holds in place while the scrollbar is
dragged. Rows are reused element by element, so the tree never goes blank between frames.

<Example name="tree/Virtual" />

### States

`loading` draws the loading row and sets `aria-busy`. An empty tree shows `emptyLabel` or the
`empty` slot and is no widget until nodes appear: no role, no focus and no name.

<Example name="tree/States" />

## Behaviour

A click on the chevron only expands, a click on the row selects, and a double click toggles
expansion. In a `checkable` tree a click on the row or the checkbox, Enter and Space toggle
the check. `children: []` is a leaf, `lazy` without `children` an expandable node that loads
on `load`.

Nodes carry no links: the application navigates on the `select` event.

## Accessibility

The root is the only element in the tab order, and the active node is referenced through
`aria-activedescendant`. Unmounting rows under virtualisation therefore never loses the focus.

The markup is the list's `ul` and `li` with the `tree` and `treeitem` roles. The DOM is flat:
`aria-level`, `aria-setsize` and `aria-posinset` carry the structure. Nodes carry
`aria-expanded`, `aria-selected`, `aria-checked` and `aria-current`.

<KeyboardReference name="NuiTree" />

## API

<ApiReference name="NuiTree" />
