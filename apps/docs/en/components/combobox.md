# Combobox

`NuiCombobox` is a text input with `role="combobox"` that filters the list as you type and
points at the active option through `aria-activedescendant` without taking focus away from
the field. It takes the same `options` as `NuiSelect`. The filter is built in (case-insensitive
on the label), replaceable by a function or disabled with `:filter="false"` for server-side
search; the `search` event carries the query and `loading` shows a loading state.

<script setup>
import { ref } from 'vue'
const city = ref()
const keywords = ref([])
const cities = [
  { value: 'berlin', label: 'Berlin' },
  { value: 'bern', label: 'Bern' },
  { value: 'madrid', label: 'Madrid' },
  { value: 'milan', label: 'Milan' },
]
const words = [
  { value: 'vue', label: 'Vue' },
  { value: 'vite', label: 'Vite' },
  { value: 'playwright', label: 'Playwright' },
]
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiField label="City">
    <NuiCombobox v-model="city" :options="cities" placeholder="Start typing" clearable />
  </NuiField>
  <NuiField label="Keywords" description="Enter adds your own value">
    <NuiCombobox v-model="keywords" :options="words" multiple :custom-value="(text) => text" placeholder="Add" />
  </NuiField>
</div>

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { NuiCombobox, NuiField, type NuiOption } from '@numior/vue';

const city = ref<string>();
const options = ref<NuiOption<string>[]>([]);
const loading = ref(false);
const search = async (query: string) => {
  loading.value = true;
  options.value = await api.cities(query);
  loading.value = false;
};
</script>

<template>
  <NuiField label="City">
    <NuiCombobox
      v-model="city"
      :options="options"
      :filter="false"
      :loading="loading"
      @search="search"
    />
  </NuiField>
</template>
```

## Behavior

- Typing opens and filters the list; the first match becomes active. ArrowDown/ArrowUp open
  the full list and move the active option, Enter selects it, Escape closes the list (and
  not a dialog around it), Tab and focus leaving close it too.
- In single mode the field shows the selected label; when the text was changed without a
  selection, the label is restored on blur.
- `customValue` maps text to a value: then Enter without an active option, or blur, adds the
  typed text (`(text) => text` for string models).
- In `multiple`, selected values are shown as `NuiChip`s in selection order; the chip button
  and Backspace in an empty field remove, Enter adds and keeps the list open. A click anywhere
  in the field focuses the input and opens the list.
- Debounce and caching stay with the application: `search` fires on every input.

## Accessibility

The field is a native `<input role="combobox" aria-autocomplete="list">` with `aria-expanded`,
`aria-controls` and `aria-activedescendant`; the list is `role="listbox"` with `aria-busy`
while loading. The list opens as `popover="manual"` because a text input cannot be a popover
invoker: dismissal follows focus and clicking an option does not steal focus from the field.
The clear, toggle and chip buttons have accessible names and `tabindex="-1"` so they do not
lengthen the Tab path.

## API

| Prop           | Type                                  | Default                                                 | Description                    |
| -------------- | ------------------------------------- | ------------------------------------------------------- | ------------------------------ |
| `v-model`      | `T \| T[]`                            | —                                                       | Value, or array in `multiple`  |
| `options`      | `NuiOptionSource<T>`                  | —                                                       | Options and groups             |
| `multiple`     | `boolean`                             | `false`                                                 | Chips and several values       |
| `filter`       | `(option, query) => boolean \| false` | by label                                                | Custom filter or none          |
| `loading`      | `boolean`                             | `false`                                                 | Loading state                  |
| `customValue`  | `(text: string) => T`                 | —                                                       | Allow free values              |
| `clearable`    | `boolean`                             | `false`                                                 | Clear button                   |
| `placeholder`  | `string`                              | —                                                       | Text without a value           |
| `name`         | `string`                              | —                                                       | Hidden form fields             |
| `getKey`       | `(value: T) => string`                | by value                                                | Key for object values          |
| `placement`    | `FloatingPlacement`                   | `'bottom-start'`                                        | Side of the list               |
| `emptyLabel`   | `string`                              | [dictionary](/en/localization#combobox): “No matches”   | Empty list text                |
| `loadingLabel` | `string`                              | [dictionary](/en/localization#list): “Loading”          | Loading text                   |
| `clearLabel`   | `string`                              | [dictionary](/en/localization#combobox): “Clear”        | Clear button name              |
| `removeLabel`  | `string`                              | [dictionary](/en/localization#combobox): “Remove”       | Prefix of the chip button name |
| `toggleLabel`  | `string`                              | [dictionary](/en/localization#combobox): “Show options” | Toggle button name             |

Event `search(query)`. Plus `id`, `size`, `disabled`, `required`, `invalid`; slot
`option="{ option, selected, active }"`; `focus()` through a ref. Block `nui-combobox`
(modifiers `--size-*`, `--open`, `--multiple`, `--invalid`, `--disabled`; elements `__field`,
`__input`, `__chip` (a `NuiChip`), `__clear`, `__toggle`, `__chevron`, `__listbox`) on top of
[`NuiList`](/en/components/list) in its `floating` variant.
