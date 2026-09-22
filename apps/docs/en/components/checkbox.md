# Checkbox

`NuiCheckbox` is a native `<input type="checkbox">` under a custom indicator. The model
is either a `boolean` or an array of selected values: with an array the checkbox adds
and removes its own `value`, keeping the other entries and their order.

<script setup>
import { ref } from 'vue'
const terms = ref(false)
const channels = ref(['email'])
</script>

<div class="nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiCheckbox v-model="terms">I accept the terms of use</NuiCheckbox>
  <NuiField group label="Notification channels" description="Selected: {{ channels.join(', ') || 'none' }}">
    <NuiCheckbox v-model="channels" value="email">Email</NuiCheckbox>
    <NuiCheckbox v-model="channels" value="sms">SMS</NuiCheckbox>
    <NuiCheckbox v-model="channels" value="push" disabled>Push</NuiCheckbox>
  </NuiField>
  <NuiCheckbox indeterminate>Partially selected</NuiCheckbox>
</div>

```vue
<NuiCheckbox v-model="terms">I accept the terms of use</NuiCheckbox>

<NuiField group label="Notification channels">
  <NuiCheckbox v-model="channels" value="email">Email</NuiCheckbox>
  <NuiCheckbox v-model="channels" value="sms">SMS</NuiCheckbox>
</NuiField>
```

## Indeterminate state

`indeterminate` is a purely visual "partially selected" state for parent checkboxes. It
is applied as a DOM property after render and is not part of the model; a click clears
it and toggles the value as usual. The indicator shows the `minus` alias from the icon
registry instead of `check`.

## Accessibility

The control stays native: Space toggles it, screen readers read the slot label, and a
group under `NuiField group` gets a `fieldset` with a `legend`. Inside a field the
checkbox inherits `disabled`, `required` and `invalid` unless set explicitly. The focus
ring is drawn on the indicator when the control matches `:focus-visible`.

## API

| Prop            | Type                   | Default    | Description                               |
| --------------- | ---------------------- | ---------- | ----------------------------------------- |
| `v-model`       | `boolean \| T[]`       | —          | Value or array of selected values         |
| `value`         | `T`                    | —          | Entry this checkbox controls in the array |
| `indeterminate` | `boolean`              | `false`    | Visual "partially selected" state         |
| `size`          | `'sm' \| 'md' \| 'lg'` | `'md'`     | Indicator and text size                   |
| `id`            | `string`               | from field | Explicit control id                       |
| `disabled`      | `boolean`              | from field | Disabled state                            |
| `required`      | `boolean`              | from field | Required state                            |
| `invalid`       | `boolean`              | from field | `aria-invalid` and an error border        |

The default slot is the label. `class` and `style` go to the root `<label>`; other
attributes and listeners reach the `<input>`. Modifiers: `nui-checkbox--checked`,
`nui-checkbox--indeterminate`, `nui-checkbox--invalid`, `nui-checkbox--disabled`,
`nui-checkbox--size-sm`.
