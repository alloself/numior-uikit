# Tree

`NuiTree` shows a hierarchy from `items` data (`value`, `label`, `description`, `icon`,
`disabled`, `children`, `lazy`): expansion lives in `v-model:expanded`, selection in
`v-model` and `v-model:values` (`selectable` is `single`, `multiple` or `false`) and cascading checkboxes in
`v-model:checked` with `checkable`. A `lazy` node without `children` emits `load` when
expanded and spins until the children arrive. Child rows unfold and fold by height over
`--nui-duration-normal` together with the chevron rotation; the `folder`/`folder-open`/`file`
icons are picked automatically and swap instantly without an appear animation
(`icons="false"` or `icon: false` on a node turns them off). `virtual`
with `height` windows long trees on the `useVirtualList` primitive.

<script setup>
import { ref } from 'vue'
const selected = ref('index')
const expanded = ref(['src'])
const checked = ref([])
const files = ref([
  { value: 'src', label: 'Sources', children: [
    { value: 'components', label: 'Components', children: [
      { value: 'button', label: 'Button.vue' },
      { value: 'input', label: 'Input.vue', disabled: true },
    ] },
    { value: 'index', label: 'index.ts', description: 'entry point' },
  ] },
  { value: 'docs', label: 'Documentation', lazy: true },
  { value: 'design', label: 'Design', children: [{ value: 'logo', label: 'logo.svg', icon: 'image' }] },
])
const load = ({ value }) => setTimeout(() => {
  files.value = files.value.map((item) => item.value === value ? { ...item, children: [{ value: 'guide', label: 'Guide.md' }] } : item)
}, 600)
const nodes = Array.from({ length: 5000 }, (_, i) => ({ value: `n${i}`, label: `Node ${i + 1}`, children: [{ value: `n${i}-leaf`, label: `Leaf ${i + 1}` }] }))
</script>

<div class="vp-raw nui-demo" data-nui-theme="light" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); align-items: start">
  <NuiTree v-model="selected" v-model:expanded="expanded" :items="files" label="Files" @load="load" />
  <NuiTree v-model:checked="checked" :items="files" :selectable="false" checkable label="Export" />
  <NuiTree :items="nodes" virtual height="12rem" label="Large tree" />
</div>

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { NuiTree, type NuiTreeItem } from '@numior/vue';
import '@numior/vue/styles/tree.css';

const selected = ref<string>();
const expanded = ref<string[]>([]);
const files = ref<NuiTreeItem<string>[]>([{ value: 'docs', label: 'Documentation', lazy: true }]);
const load = async (item: NuiTreeItem<string>) => {
  const children = await api.children(item.value);
  files.value = files.value.map((entry) =>
    entry.value === item.value ? { ...entry, children } : entry,
  );
};
</script>

<template>
  <NuiTree
    v-model="selected"
    v-model:expanded="expanded"
    :items="files"
    label="Files"
    @load="load"
  />
</template>
```

## Behaviour

The tree keeps a flat model of the visible nodes and works on it: keyboard, `aria-level`,
`aria-setsize`/`aria-posinset`, the checkbox cascade and windowing all read the same sequence.
Keys follow the WAI-ARIA treeview pattern: ↑/↓ move across enabled nodes, Home/End,
PageUp/PageDown, → expands or enters the first child, ← collapses or climbs to the parent,
`*` expands every sibling, Enter selects (toggles in `multiple`), Space toggles the checkbox
and printable characters search the visible labels; in RTL ← and → swap. A click on the
chevron only expands, on the checkbox only checks, on the row selects, and a double click
toggles expansion.

The cascade: checking a node checks its enabled descendants, ancestors become `checked`
once all of their enabled children are checked and `mixed` when only some are; disabled
nodes and their subtrees never change. The `checked` model keeps values in document order.
`children: []` is a leaf, `lazy` without `children` is an expandable node that loads on `load`.

## Accessibility

The root is the only element in the Tab order (`role="tree" tabindex="0"`) and the active
node is referenced through `aria-activedescendant`, so unmounting rows under windowing never
drops focus and the active row always stays rendered. The DOM is flat: nested `role="group"`
elements are impossible with windowed rendering, so `aria-level`, `aria-setsize` and
`aria-posinset` carry the structure. Nodes expose `aria-expanded`, `aria-selected`,
`aria-checked` (`mixed`), `aria-disabled` and `aria-busy`. The tree is named by `label` or
`labelledBy`.

## Virtualisation

`virtual` with `height` renders only the visible window of fixed-height rows (`itemHeight`,
32px by default) plus overscan, and keeps the active row mounted. The server renders the
first 20 rows. The `useVirtualList` primitive from `@numior/primitives` takes a container,
`count`, `itemSize` (a number or a function), `overscan`, `initialCount`, `enabled` and
`pinned`, and returns `range`, `items` (`index`, `start`, `size`), `totalSize`,
`startSize`/`endSize` for spacers, `scrollTo(index, { align })` and `measure()`. The table
uses the same primitive.

## API

| Prop                        | Type                              | Default    | Description                             |
| --------------------------- | --------------------------------- | ---------- | --------------------------------------- |
| `items`                     | `NuiTreeItem<T>[]`                | —          | Nodes                                   |
| `modelValue`                | `T \| null`                       | `null`     | Value in single mode (`v-model`)        |
| `values`                    | `T[]`                             | `[]`       | Values in `multiple` (`v-model:values`) |
| `expanded`                  | `T[]`                             | `[]`       | Expanded nodes (`v-model:expanded`)     |
| `checked`                   | `T[]`                             | `[]`       | Checked nodes (`v-model:checked`)       |
| `selectable`                | `'single' \| 'multiple' \| false` | `'single'` | Selection mode                          |
| `checkable`                 | `boolean`                         | `false`    | Cascading checkboxes                    |
| `getKey`                    | `(value: T) => string`            | —          | Key of object values                    |
| `icons`                     | `boolean`                         | `true`     | Folder and file icons                   |
| `virtual`                   | `boolean`                         | `false`    | Windowing (needs `height`)              |
| `height`                    | `string`                          | —          | Height of the scrolling area            |
| `itemHeight`                | `number`                          | `32`       | Row height in px under `virtual`        |
| `size`                      | `'sm' \| 'md' \| 'lg'`            | `'md'`     | Row height                              |
| `loop`                      | `boolean`                         | `false`    | ↑/↓ wrap around                         |
| `typeahead`                 | `boolean`                         | `true`     | Search by first letters                 |
| `label`, `labelledBy`, `id` | `string`                          | —          | Name and identifier                     |

Events `expand`, `collapse`, `load` and `select` carry the node. Slot `item`
(`{ item, level, expanded, selected, checked, loading }`). Block `nui-tree`, modifiers
`--size-*`, `--virtual`, `--checkable`, `--multiple`; elements `__list`, `__item` (`--active`,
`--selected`, `--disabled`, `--expanded`, `--loading`), `__toggle`, `__chevron`, `__spinner`,
`__checkbox` (`--checked`, `--indeterminate`), `__icon`, `__text`, `__label`, `__description`;
variables `--_indent`, `--_row`, `--_height`, `--_level`, `--_start`.
