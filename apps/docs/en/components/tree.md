# Tree

`NuiTree` shows a hierarchy from `items`: expansion in `v-model:expanded`, selection in
`v-model` or `v-model:values`, cascading checkboxes in `v-model:checked`. Folder and file icons
appear on their own, `virtual` with `height` virtualises long trees.

<Example name="tree/Basic" />

## Installation

```ts
import { NuiTree } from '@numior/vue';
import '@numior/vue/styles/tree.css';
```

## Examples

### Cascading checkboxes

Checking a node checks its descendants; ancestors become checked when every child is checked
and mixed when only some are. The model keeps the values in document order.

<Example name="tree/Checkable" />

### Lazy loading

A `lazy` node without `children` emits `load` when expanded and shows a spinner until the
children arrive.

<Example name="tree/Lazy" />

### Virtualisation

`virtual` with `height` renders only the visible window of `itemHeight` rows. The active row
always stays in the DOM, and the server renders the first 20 rows.

<Example name="tree/Virtual" />

## Behaviour

A click on the chevron only expands, on the checkbox only checks, on the row selects, and a
double click toggles expansion. `children: []` is a leaf, `lazy` without `children` an
expandable node that loads on `load`.

## Accessibility

The root is the only element in the tab order, and the active node is referenced through
`aria-activedescendant`. Unmounting rows under virtualisation therefore never loses the focus. The DOM
is flat: `aria-level`, `aria-setsize` and `aria-posinset` carry the structure, nodes carry
`aria-expanded`, `aria-selected` and `aria-checked`.

<KeyboardReference name="NuiTree" />

## API

<ApiReference name="NuiTree" />
