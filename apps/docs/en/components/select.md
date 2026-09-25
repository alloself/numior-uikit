# Select

`NuiSelect` is a `role="combobox"` button that opens a `role="listbox"` in a native popover
at least as wide as the trigger. Values come from `options`: flat entries
`{ value, label, description?, disabled?, icon? }` or groups `{ label, options }`. It supports
single and multiple selection, clearing, typeahead on the closed trigger and hidden
`<input type="hidden">` fields for form submission.

<script setup>
import { ref } from 'vue'
const country = ref()
const tags = ref(['frontend'])
const countries = [
  { value: 'at', label: 'Austria' },
  { value: 'de', label: 'Germany' },
  { value: 'dk', label: 'Denmark', disabled: true },
  { label: 'Asia', items: [{ value: 'vn', label: 'Vietnam' }, { value: 'jp', label: 'Japan' }] },
]
const tagOptions = [
  { value: 'frontend', label: 'Frontend' },
  { value: 'backend', label: 'Backend' },
  { value: 'design', label: 'Design' },
]
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiField label="Country">
    <NuiSelect v-model="country" :options="countries" placeholder="Pick a country" clearable />
  </NuiField>
  <NuiField label="Tags">
    <NuiSelect v-model="tags" :options="tagOptions" multiple />
  </NuiField>
</div>

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { NuiField, NuiSelect, type NuiOptionSource } from '@numior/vue';

const country = ref<string>();
const countries: NuiOptionSource<string> = [
  { value: 'at', label: 'Austria' },
  { value: 'de', label: 'Germany' },
  { label: 'Asia', items: [{ value: 'vn', label: 'Vietnam' }] },
];
</script>

<template>
  <NuiField label="Country">
    <NuiSelect v-model="country" :options="countries" placeholder="Pick a country" clearable />
  </NuiField>
</template>
```

## Behavior

- Click, Enter and Space open the list on the selected option, ArrowDown/ArrowUp on the
  first or last one, Home/End at the edges. Inside, arrows loop, Home/End and typeahead
  work; Escape closes, so do Tab and focus leaving.
- On the closed trigger, typing letters changes the value without opening, like a native
  `<select>`.
- In single mode Enter, Space and click select and close. In `multiple`, Space and click
  toggle an option and the list stays open, Enter closes; the trigger shows one label or
  `countLabel(count)`.
- `clearable` adds a clear button, `disabled` options stay listed and are skipped, `name`
  renders one hidden field per value.

## Accessibility

The trigger is a native `<button role="combobox">` with `aria-haspopup="listbox"`,
`aria-expanded` and `aria-controls`; inside `NuiField` it receives `id`, `aria-labelledby`,
`aria-describedby`, `aria-invalid` and `aria-required`. The list is `role="listbox"`
(`aria-multiselectable` in `multiple`), groups are `role="group"` with a label, options are
`role="option"` with `aria-selected` and `aria-disabled`. Object values need `getKey`,
otherwise JSON becomes the key.

## API

| Prop          | Type                        | Default          | Description                         |
| ------------- | --------------------------- | ---------------- | ----------------------------------- |
| `v-model`     | `T \| T[]`                  | —                | Value, or array in `multiple`       |
| `options`     | `NuiOptionSource<T>`        | —                | Options and groups                  |
| `multiple`    | `boolean`                   | `false`          | Several values                      |
| `clearable`   | `boolean`                   | `false`          | Clear button                        |
| `placeholder` | `string`                    | —                | Text without a value                |
| `name`        | `string`                    | —                | Hidden form fields                  |
| `getKey`      | `(value: T) => string`      | by value         | Key for object values               |
| `loop`        | `boolean`                   | `true`           | Arrow looping                       |
| `placement`   | `FloatingPlacement`         | `'bottom-start'` | Side of the list                    |
| `countLabel`  | `(count: number) => string` | `N selected`     | Label for several values            |
| `emptyLabel`  | `string`                    | `'No options'`   | Empty list text                     |
| `clearLabel`  | `string`                    | `'Clear'`        | Accessible name of the clear button |

Plus `id`, `size`, `disabled`, `required`, `invalid` like every field control. Slots
`value="{ selected }"` and `option="{ option, selected, active }"`. Block `nui-select`
(modifiers `--size-*`, `--open`, `--empty`, `--clearable`, `--invalid`, `--disabled`; elements
`__trigger`, `__value`, `__chevron`, `__clear`, `__listbox`). The dropdown is
[`NuiList`](/en/components/list) in its `floating` variant: the same groups, `nui-list-item`
rows with `--active`, `--selected`, `--disabled` and the `__status`/`__empty` states.
