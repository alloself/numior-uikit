# Radio group

`NuiRadioGroup` joins native `<input type="radio">` controls with a shared `name`, so
arrow-key navigation, exclusive selection and form participation work without
JavaScript. A value of any type comes through `v-model`; every `NuiRadio` declares its
own `value`.

<script setup>
import { ref } from 'vue'
const plan = ref('team')
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiField group label="Plan" description="Selected: {{ plan }}">
    <NuiRadioGroup v-model="plan">
      <NuiRadio value="free">Free</NuiRadio>
      <NuiRadio value="team">Team</NuiRadio>
      <NuiRadio value="business" disabled>Business</NuiRadio>
    </NuiRadioGroup>
  </NuiField>
  <NuiField group label="Horizontal">
    <NuiRadioGroup v-model="plan" orientation="horizontal" size="sm">
      <NuiRadio value="free">Free</NuiRadio>
      <NuiRadio value="team">Team</NuiRadio>
    </NuiRadioGroup>
  </NuiField>
</div>

```vue
<NuiField group label="Plan">
  <NuiRadioGroup v-model="plan">
    <NuiRadio value="free">Free</NuiRadio>
    <NuiRadio value="team">Team</NuiRadio>
  </NuiRadioGroup>
</NuiField>
```

## Label and description

Wrap the group in `NuiField group`: the field renders a `fieldset` with a `legend`, and
the group gets `role="radiogroup"`, `aria-labelledby` pointing at the legend and
`aria-describedby` pointing at the description and error. The field's `required`,
`disabled` and `invalid` apply to the whole group; `disabled` on a single `NuiRadio`
disables only that radio.

## API

`NuiRadioGroup`

| Prop          | Type                         | Default      | Description                           |
| ------------- | ---------------------------- | ------------ | ------------------------------------- |
| `v-model`     | `T`                          | —            | Selected value                        |
| `name`        | `string`                     | group id     | Shared native name of the radios      |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | Layout                                |
| `size`        | `'sm' \| 'md' \| 'lg'`       | `'md'`       | Size of the radios inside             |
| `id`          | `string`                     | from field   | Id of the `role="radiogroup"` element |
| `disabled`    | `boolean`                    | from field   | Disables every radio                  |
| `required`    | `boolean`                    | from field   | `aria-required`                       |
| `invalid`     | `boolean`                    | from field   | `aria-invalid` and error indicators   |

`NuiRadio`

| Prop       | Type      | Default    | Description         |
| ---------- | --------- | ---------- | ------------------- |
| `value`    | `T`       | required   | Value of this radio |
| `id`       | `string`  | generated  | Explicit id         |
| `disabled` | `boolean` | from group | Disables one radio  |

The `NuiRadio` slot is the label; `class` and `style` go to the `<label>`, everything
else to the `<input>`. Modifiers: `nui-radio-group--orientation-horizontal`,
`nui-radio-group--size-sm`, `nui-radio--checked`, `nui-radio--disabled`,
`nui-radio--invalid`.
