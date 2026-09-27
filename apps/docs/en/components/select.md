# Select

`NuiSelect` opens a list of options in a native popover at least as wide as the trigger. Values
come from `options`, the choice is single or multiple.

<Example name="select/Basic" />

## Installation

```ts
import { NuiField, NuiSelect } from '@numior/vue';
import '@numior/tokens/theme.css';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/select.css';
```

Inside `NuiField` the trigger receives its label, description and error state without extra props.

## Examples

### Groups and disabled options

A group is an entry `{ label, items }`. A disabled option stays listed but the arrows skip it.

<Example name="select/Groups" />

### Several values

`multiple` toggles options without closing the list. The trigger shows one option label or the
dictionary text "N selected".

<Example name="select/Multiple" />

### Object values

Objects need `getKey`; the `option` slot draws an option its own way.

<Example name="select/Objects" />

### Sizes

`size` matches the steps of the other field controls.

<Example name="select/Sizes" />

## Accessibility

The trigger is a native `<button role="combobox">` with `aria-expanded` and `aria-controls`. The
list is `role="listbox"`, groups are `role="group"` with a label, options are `role="option"` with
`aria-selected`.

On the closed trigger, typing letters changes the value without opening, like a native `<select>`.

<KeyboardReference name="NuiSelect" />

## API

<ApiReference name="NuiSelect" />
