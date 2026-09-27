# Combobox

`NuiCombobox` is a text field with `role="combobox"`: the list filters as you type while the
focus stays in the field. The options are the same as in `NuiSelect`.

<Example name="combobox/Basic" />

## Installation

```ts
import { NuiCombobox } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/list.css';
import '@numior/vue/styles/chip.css';
import '@numior/vue/styles/combobox.css';
```

## Examples

### Several values

`multiple` shows the selection as chips in selection order; `customValue` turns the typed text
into a new value on Enter.

<Example name="combobox/Multiple" />

### Server-side search

`:filter="false"` switches the built-in filter off, the `search` event sends the query on every
input, `loading` shows the loading state. Debouncing and caching stay with the app.

<Example name="combobox/Async" />

### Custom option markup

The `option` slot receives the option and its states.

<Example name="combobox/Option" />

## Accessibility

The field is a native `<input role="combobox" aria-autocomplete="list">` with `aria-expanded`,
`aria-controls` and `aria-activedescendant`; the list is a `role="listbox"` with `aria-busy`
while loading. The clear, toggle and chip remove buttons stay out of the tab order, and their
actions are reachable from the field with the keyboard.

<KeyboardReference name="NuiCombobox" />

## API

<ApiReference name="NuiCombobox" />
