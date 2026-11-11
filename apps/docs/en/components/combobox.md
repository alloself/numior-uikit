# Combobox

`NuiCombobox` is a field with a dropdown list that narrows as you type. Use it when there are many
options and the right one is easier to find by its first letters: cities, employees, tags.

<Example name="combobox/Basic" />

## Installation

```ts
import { NuiCombobox } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/list.css';
import '@numior/vue/styles/chip.css';
import '@numior/vue/styles/combobox.css';
```

## Usage

Pass the options in `options` in the same shape as for a [Select](/en/components/select): `value`
and `label`. The list keeps the options whose label contains the typed text. The `clearable` prop
adds a clear button.

The search ignores case, Latin accents and the difference between the Russian «е» and «ё». Your
own function in `filter` gets the text in lower case only and compares on its own.

## Examples

### Several values

With `multiple` the selected options appear in the field as chips, and `v-model:values` holds
their array. The `customValue` prop adds the typed text as a new value on Enter when the list has
no such option.

<Example name="combobox/Multiple" />

### Server-side search

With `:filter="false"` the component does not filter the list itself. The `search` event arrives
with the text on every input: load the options and pass them to `options`.

<Example name="combobox/Async" />

While the options are loading, pass `loading` to show a spinner in the list. The delay before a
request and the response cache are up to your app.

### Custom option markup

The `option` slot replaces an option row with your own markup, such as a department next to a
name. The slot receives `option`, `selected` and `active`.

<Example name="combobox/Option" />

## Accessibility

Focus stays in the field the whole time, and the arrow keys move through the options. Tab skips
the clear, open and chip remove buttons: these actions are done with the keyboard from the field.

<KeyboardReference name="NuiCombobox" />

## API

<ApiReference name="NuiCombobox" />
