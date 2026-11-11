# Tree

`NuiTree` displays nested data such as folders and files, catalog sections or company
departments. Nodes expand and collapse, and they can be selected one at a time or checked with
checkboxes.

<Example name="tree/Basic" />

Nodes are set in `items`, nested nodes in `children`. The selected node comes through `v-model`,
and the keys of expanded nodes through `v-model:expanded`. Nodes with children get a folder icon
and the rest a file icon; `:icons="false"` removes the icons.

## Installation

```ts
import { NuiTree } from '@numior/vue';
import '@numior/vue/styles/list.css';
import '@numior/vue/styles/tree.css';
```

## Examples

### Styling and row labels

Tree rows look like [List](/en/components/list) items and take the same fields: `badge` and
`shortcut` sit at the end of the row. The `current` field marks the node that is open right now,
independently of the selection.

The `variant` prop changes the look: `plain`, `divided`, `outline` or `floating`. The `size`
prop changes the row height.

<Example name="tree/Variants" />

### Checkboxes

The `checkable` prop adds checkboxes to the nodes, and the values of checked nodes come through
`v-model:values` in the order of the tree. Checking a folder checks everything inside it.

A folder is checked when all its children are checked, and partly checked when only some are.

<Example name="tree/Checkable" />

### Loading on demand

A node with `lazy` and without `children` can be expanded even though it has no children yet. On
expand the tree emits the `load` event and shows a loading indicator until the application adds
the children to `items`.

The value of the node enters `v-model:expanded` at once. The folder stays closed and
`aria-expanded` is `false` until the children arrive: a node looks expanded when it has rows
under it.

If the folder was checked, the children that arrive are checked too.

<Example name="tree/Lazy" />

### Load failure

When the children fail to load, remove the node from `v-model:expanded`: the indicator goes
away, and the next expand emits `load` again. The application shows the error message, in the
example with an [Alert](/en/components/alert).

<Example name="tree/LoadError" />

### Large trees

With `virtual` and `height` the tree renders only the rows visible in the scroll area instead of
all the thousands of nodes at once. The row height follows `size`, and `itemHeight` sets it in
pixels.

Server rendering puts the first 20 rows into the HTML. The focused row stays in the DOM even when
it is scrolled out of view.

<Example name="tree/Virtual" />

### Loading and empty tree

The `loading` prop shows a "Loading" row instead of the nodes. A tree without nodes shows
`emptyLabel` or the `empty` slot.

<Example name="tree/States" />

## Behaviour

A click on the arrow expands the node, a click on the row selects it, and a double click expands
or collapses it. In a tree with checkboxes a click on the row, Enter and Space toggle the check.

A node with `children: []` is a leaf and does not expand. Rows are never links: to open a page,
listen to the `select` event.

## Accessibility

The whole tree is one Tab stop, and the arrows move between the nodes. The focused node is
referenced through `aria-activedescendant`, so the focus is not lost when rows leave the DOM
while scrolling.

When the focused node is hidden from outside (its parent is collapsed through
`v-model:expanded`), the focus moves to the nearest visible ancestor. When the node is gone from
`items`, the node that took its place gets the focus. The arrows continue from there, not from
the start of the tree.

The tree is built on a `ul` list with the `tree` and `treeitem` roles. `aria-level`,
`aria-setsize` and `aria-posinset` carry the level and position of a node, and `aria-expanded`,
`aria-selected`, `aria-checked` and `aria-current` carry its state.

While `loading`, the tree gets `aria-busy`. An empty tree is a plain block without a role or
focus.

<KeyboardReference name="NuiTree" />

## API

<ApiReference name="NuiTree" />
