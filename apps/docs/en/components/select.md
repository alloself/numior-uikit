# Select

A field with a dropdown list of values.

<Example name="select/Basic" />

Pass the options to `options` as `{ value, label }` entries.

## Installation

```ts
import { NuiSelect } from '@numior/kit';
```

## Usage

Change the size, the side the list opens on and the states of the field.

<Configurator name="NuiSelect" />

To let users search the list, use a [Combobox](/en/components/combobox).

## Examples

### Split the options into groups

Pass a `{ label, items }` entry.

<Example name="select/Groups" />

An option with `disabled` stays in the list, but it cannot be picked and the arrow keys skip it.

### Pick several values

Add `multiple`.

<Example name="select/Multiple" />

The values come to `v-model:values`, and when more than one is picked, the field shows how many.

### Keep an object in the model

Pass `getKey`.

<Example name="select/Objects" />

The field finds the picked option by the key from `getKey`, such as the customer id. Without it the
key is the JSON of the object, and a copy with one changed field no longer matches its option.

### Pick from a tree

Add `children` to the options.

<Example name="select/Tree" />

The list opens with the branch of the picked value expanded. Mark a branch `lazy` to load it on
expand, and fill its `children` in the `load` handler, as in a [Tree](/en/components/tree).

## Accessibility

The field has the `combobox` role and opens a `listbox` of options, or a `tree` for nested ones.
As with a native `<select>`, typing the first letters on the closed field picks a matching option
in a flat list of single values.

<KeyboardReference name="NuiSelect" />

## API

<ApiReference name="NuiSelect" />
