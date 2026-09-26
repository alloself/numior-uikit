# Checkbox

`NuiCheckbox` is a native `<input type="checkbox">` under a custom indicator with a `boolean`
model. A set of values is picked by `NuiCheckboxGroup`: it takes options and keeps the array
of selected values in `v-model` in selection order, so the model type always matches what
the component emits.

<script setup>
import { ref } from 'vue'
const terms = ref(false)
const channels = ref(['email'])
const channelOptions = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'push', label: 'Push', disabled: true },
]
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiCheckbox v-model="terms">I accept the terms of use</NuiCheckbox>
  <NuiField group label="Notification channels" description="Selected: {{ channels.join(', ') || 'nothing' }}">
    <NuiCheckboxGroup v-model="channels" :options="channelOptions" />
  </NuiField>
  <NuiCheckbox indeterminate>Partially selected</NuiCheckbox>
</div>

```vue
<NuiCheckbox v-model="terms">I accept the terms of use</NuiCheckbox>

<NuiField group label="Notification channels">
  <NuiCheckboxGroup v-model="channels" :options="channelOptions" />
</NuiField>
```

## Indeterminate state

`indeterminate` is a visual-only "partially selected" state for parent checkboxes. It is set
as a DOM property after render and stays out of the model; a click clears it and toggles the
value as usual. The indicator shows the `minus` alias from the icon registry instead of
`check`.

## Accessibility

The control stays native: Space toggles and screen readers read the label from the slot. A
single checkbox inside a field inherits `disabled`, `required` and `invalid` unless they are
set explicitly. `NuiCheckboxGroup` is a `role="group"` named by the label of a
`NuiField group` and described by the field; its checkboxes share the native `name` and the
group state and do not take the field id. The focus ring is drawn on the indicator on the
control's `:focus-visible`.

## API

`NuiCheckbox`

| Prop            | Type                   | Default    | Description                       |
| --------------- | ---------------------- | ---------- | --------------------------------- |
| `v-model`       | `boolean`              | `false`    | Whether the checkbox is checked   |
| `value`         | `string`               | —          | Native value for form submission  |
| `indeterminate` | `boolean`              | `false`    | Visual "partially selected" state |
| `size`          | `'sm' \| 'md' \| 'lg'` | `'md'`     | Indicator and text size           |
| `id`            | `string`               | from field | Explicit control id               |
| `disabled`      | `boolean`              | from field | Disabled                          |
| `required`      | `boolean`              | from field | Required                          |
| `invalid`       | `boolean`              | from field | `aria-invalid` and a red border   |

The default slot is the label. `class` and `style` go to the root `<label>`, other attributes
and listeners go to the `<input>`. Modifiers: `nui-checkbox--checked`,
`nui-checkbox--indeterminate`, `nui-checkbox--invalid`, `nui-checkbox--disabled`,
`nui-checkbox--size-sm`.

`NuiCheckboxGroup`

| Prop                                    | Type                         | Default      | Description                            |
| --------------------------------------- | ---------------------------- | ------------ | -------------------------------------- |
| `v-model`                               | `T[]`                        | `[]`         | Selected values                        |
| `options`                               | `NuiOption<T>[]`             | —            | Options (`value`, `label`, `disabled`) |
| `name`                                  | `string`                     | group id     | Shared native name of the checkboxes   |
| `orientation`                           | `'vertical' \| 'horizontal'` | `'vertical'` | Layout                                 |
| `getKey`                                | `(value: T) => string`       | by value     | Key for object values                  |
| `size`                                  | `'sm' \| 'md' \| 'lg'`       | `'md'`       | Checkbox size                          |
| `id`, `disabled`, `required`, `invalid` | —                            | from field   | As on other field controls             |

The `option="{ option }"` slot replaces an option label. Block `nui-checkbox-group`, modifiers
`--orientation-*`, `--invalid`, `--disabled`.
