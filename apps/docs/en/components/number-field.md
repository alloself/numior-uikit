# Number field

`NuiNumberField` is a text field with the `spinbutton` role that holds `number | null` and
shows the number in the locale format: group and decimal separators, currency, percent and
local digits through `Intl.NumberFormat`. While the field has focus the text stays as typed;
on blur or Enter the value is parsed, clamped to `min`/`max` and formatted again.

<script setup>
import { ref } from 'vue'
const price = ref(1234.5)
const quantity = ref(2)
const discount = ref(0.15)
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiField label="Price" description="Euro, step 0.5">
    <NuiNumberField locale="en-US" v-model="price" :min="0" :step="0.5" :format-options="{ style: 'currency', currency: 'EUR' }" />
  </NuiField>
  <NuiField label="Quantity" description="From 0 to 10">
    <NuiNumberField locale="en-US" v-model="quantity" :min="0" :max="10" />
  </NuiField>
  <NuiField label="Discount" description="Percent without steppers">
    <NuiNumberField locale="en-US" v-model="discount" :min="0" :max="1" :step="0.01" :steppers="false" :format-options="{ style: 'percent' }" />
  </NuiField>
</div>

```vue
<NuiField label="Price">
  <NuiNumberField
    v-model="price"
    :min="0"
    :step="0.5"
    :format-options="{ style: 'currency', currency: 'EUR' }"
  />
</NuiField>
```

## Behaviour

The locale comes from `createNuiConfig({ locale })` or the closest `provideNuiConfig({ locale })`, the
`locale` prop overrides it per field, and `en-US` applies without any setup;
`navigator.language` is never read so server and client format identically. Parsing
accepts local and ASCII digits and the locale decimal separator (plus a dot where it is not
the group separator), drops spaces and group separators, treats any minus form and
parentheses as negative, and divides by 100 under `style: 'percent'`. Unrecognised text
clears the value. In locales with a dot group separator (`de-DE`) the string `1.5` reads as
15, exactly as in `Intl`.

Keys: ↑/↓ change the value by `step`, ten steps with Shift, PageUp/PageDown also ten steps,
Home/End go to `min`/`max`. Stepping runs on integers, so `0.7 + 0.1` is exactly `0.8`;
values snap to the grid anchored at `min`, and an empty field becomes `1` or `min` on ↑.
Without explicit options the format precision widens to the step's decimals;
`formatOptions` with explicit digits or a currency stay untouched. A `notation` other than
`standard` formats but does not parse back. Enter commits the value and lets the form
submit.

## Accessibility

The only accessible element is `<input role="spinbutton" inputmode="decimal">` with
`aria-valuenow`, `aria-valuemin`, `aria-valuemax` and a locale-formatted `aria-valuetext`.
The steppers sit in an `aria-hidden` wrapper with `tabindex="-1"` and never take focus from
the field. The iOS `decimal` keyboard has no minus key: pass `inputmode="text"` as an
attribute when negative values are expected.

## API

| Prop             | Type                       | Default       | Description                            |
| ---------------- | -------------------------- | ------------- | -------------------------------------- |
| `v-model`        | `number \| null`           | `null`        | Value                                  |
| `min`, `max`     | `number`                   | —             | Bounds, clamped on commit and stepping |
| `step`           | `number`                   | `1`           | Step for keys and steppers             |
| `formatOptions`  | `Intl.NumberFormatOptions` | —             | Currency, percent, digits              |
| `locale`         | `string`                   | from config   | Locale for formatting and parsing      |
| `steppers`       | `boolean`                  | `true`        | ± buttons at the end edge              |
| `readonly`       | `boolean`                  | `false`       | Read-only, steppers disabled           |
| `name`           | `string`                   | —             | Hidden `input` with the number         |
| `incrementLabel` | `string`                   | `'Increment'` | Label of the "+" button                |
| `decrementLabel` | `string`                   | `'Decrement'` | Label of the "−" button                |
| `size`           | `'sm' \| 'md' \| 'lg'`     | `'md'`        | Size step                              |
| `id`             | `string`                   | from field    | Explicit control id                    |
| `disabled`       | `boolean`                  | from field    | Disabled state                         |
| `required`       | `boolean`                  | from field    | Required state                         |
| `invalid`        | `boolean`                  | from field    | `aria-invalid` and an error border     |

Slots: `prefix`, `suffix`. `focus()` is available through a template ref. Block
`nui-number-field` (modifiers `--size-*`, `--invalid`, `--disabled`, `--readonly`,
`--steppers`; elements `__control`, `__prefix`, `__suffix`, `__steppers`, `__stepper` with
`--up`/`--down`; variables `--_height`, `--_padding`, `--_font-size`, `--_stepper`).
