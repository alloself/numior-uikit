# Tree

Nested data that opens level by level.

<Example name="tree/Basic" />

Pass the nodes in `items` and the nested ones in `children`. The selected node comes through
`v-model`, and the expanded ones through `v-model:expanded`.

## Installation

```ts
import { NuiTree } from '@numior/kit';
```

## Usage

Change the look and the row size, or add checkboxes, on a tree of store categories.

<Configurator name="NuiTree" />

## Examples

### Mark rows with labels

Add `badge`, `shortcut` and `current` to a node.

<Example name="tree/Marks" />

A node with `current` is the one open right now, whatever the selection.

### Cascading selection

Add `checkable`.

<Example name="tree/Checkable" />

Checked values come through `v-model:values` in tree order. Checking a category checks everything
inside it, and a category with only some children checked shows as partly checked.

### Lazy loading

Mark a node with `lazy` and add its `children` when the tree emits `load`.

<Example name="tree/Lazy" />

Until the children arrive, the node shows a loading indicator. In a `checkable` tree, the children
of a checked node arrive checked.

### Handle a load failure

Remove the node from `v-model:expanded` when its children fail to load.

<Example name="tree/LoadError" />

The loading indicator goes away, and the next expand emits `load` again. Tell the user what went
wrong, for example with an [Alert](/en/components/alert).

### Show a large tree

Add `virtual` and `height`.

<Example name="tree/Virtual" />

The row height follows `size`, or `itemHeight` sets it in pixels. Server rendering puts the first
20 rows into the HTML.

### Show loading and an empty tree

Add `loading` while the nodes are on their way; a tree without nodes shows `emptyLabel`.

<Example name="tree/States" />

## Behavior

A click on the arrow or a double click on the row expands or collapses a node. A single click on
the row selects it, and in a `checkable` tree checks it or clears the check.

A node with `children: []` is a leaf and does not expand. Rows are never links: to open a page,
listen to the `select` event.

## Accessibility

The whole tree is one Tab stop, and the arrows move between the nodes. The focus stays on the tree
while you scroll, even when the focused row goes out of view.

When the parent of the focused node collapses through `v-model:expanded`, the focus moves to the
nearest visible ancestor. When the node leaves `items`, the node that took its place gets the
focus, and the arrows continue from there.

A screen reader announces the level, the position and the state of a node. A lazy node enters
`v-model:expanded` at once, yet a screen reader announces it as collapsed until its children arrive.

While `loading`, the tree tells a screen reader that it is busy. An empty tree is a plain block
without a role or focus.

<KeyboardReference name="NuiTree" />

## API

<ApiReference name="NuiTree" />
