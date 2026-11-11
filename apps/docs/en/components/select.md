# Select

`NuiSelect` is a field with a dropdown list for picking one or several values: a country, a
city, an assignee. When users need to search the list or type their own value, use a
[Combobox](/en/components/combobox).

<Example name="select/Basic" />

Options go into `options` as `{ value, label }` entries, and the chosen value lives in
`v-model`. With `clearable` a clear button appears next to the value. The list opens at least as
wide as the field.

## Installation

```ts
import { NuiSelect } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/list.css';
import '@numior/vue/styles/select.css';
```

## Usage

Change the size, the side of the list and the field states to fit your form.

<Configurator name="NuiSelect" />

## Examples

### Groups and disabled options

To split options into groups, pass a `{ label, items }` entry. An option with `disabled` stays
visible in the list, but it cannot be chosen and the arrow keys skip it.

<Example name="select/Groups" />

### Several values

With `multiple` a click on an option checks it, and the list stays open. The chosen values live
in `v-model:values`. The field shows the option label, or "3 selected" when there is more than
one.

<Example name="select/Multiple" />

### Objects as values

When values are objects, pass `getKey`: the function returns the key that tells options apart.
The `option` slot changes the markup of an option, for example to add a job title next to a
name.

<Example name="select/Objects" />

### Tree

When options have `children`, a tree opens instead of a list, with the branch of the chosen value
already expanded. With `multiple` the options get checkboxes, and checking a parent checks all
its descendants.

A branch with `lazy` instead of `children` loads on expand: `NuiSelect` emits a `load` event,
like [Tree](/en/components/tree).

<Example name="select/Tree" />

### Sizes

`size` takes `sm`, `md` and `lg`, as in the other inputs, so fields of different types in one
form line up in height.

<Example name="select/Sizes" />

## Accessibility

The field is a native button with the `combobox` role, and the list is a `listbox` with `option`
items. A screen reader announces whether the list is open and reads the chosen option. For a
tree the roles become `tree` and `treeitem`.

As with a native `<select>`, typing the first letters of an option on the closed field changes
the value without opening the list.

<KeyboardReference name="NuiSelect" />

## API

<ApiReference name="NuiSelect" />
