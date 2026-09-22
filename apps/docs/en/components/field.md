# Field

`NuiField` connects a control with its label, description and error. The field creates
a shared `id`, and the control inside receives `id`, `aria-describedby`, `aria-invalid`,
`required` and `disabled` through provide/inject. Controls also work without
`NuiField`; explicit control props always override the field context.

<script setup>
import { ref } from 'vue'
const email = ref('')
</script>

<div class="nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiField
    label="Work email"
    description="Mail is delivered to verified addresses only"
    :error="email && !email.includes('@') ? 'Enter an address with an @ sign' : undefined"
    required
  >
    <NuiInput v-model="email" type="email" placeholder="name@company.com" />
  </NuiField>
</div>

```vue
<NuiField
  label="Work email"
  description="Mail is delivered to verified addresses only"
  :error="error"
  required
>
  <NuiInput v-model="email" type="email" />
</NuiField>
```

The result: a `<label for="…">`, the control with the same `id`, and a description and
error with `id="…-description"` and `id="…-error"` listed in `aria-describedby`. When
`error` is set, the field and the control become `invalid`. Every relation is computed on
the server, so SSR and hydration produce the same markup.

## Groups of controls

`group` turns the field into a `<fieldset>` with a `<legend>`, which is how radio groups
and sets of checkboxes are labelled. Controls inside a group keep their own `id`, and
`disabled` applies natively to the whole `fieldset`.

```vue
<NuiField group label="Plan" description="You can change it later">
  <NuiRadioGroup v-model="plan">…</NuiRadioGroup>
</NuiField>
```

## Slots and parts

Pass the label, description and error through the `label`, `description` and `error`
slots when you need richer markup than text. The `NuiFieldLabel`, `NuiFieldDescription`
and `NuiFieldError` parts are exported for your own wrappers built on `provideField`
from `@numior/primitives`; inside `NuiField` prefer props and named slots so that
`aria-describedby` is known during server rendering.

## API

| Prop          | Type      | Default   | Description                                           |
| ------------- | --------- | --------- | ----------------------------------------------------- |
| `id`          | `string`  | generated | Control id; the other ids derive from it              |
| `label`       | `string`  | —         | Label text; the `label` slot is the alternative       |
| `description` | `string`  | —         | Description below the control; `description` slot     |
| `error`       | `string`  | —         | Error text; makes the field and control `invalid`     |
| `invalid`     | `boolean` | `false`   | Mark the field invalid without an error text          |
| `required`    | `boolean` | `false`   | Required marker and the `required` attribute          |
| `disabled`    | `boolean` | `false`   | Disables the control; for a group, the whole fieldset |
| `group`       | `boolean` | `false`   | `fieldset` + `legend` instead of `label`              |

The `data-invalid`, `data-required` and `data-disabled` root attributes are available
for styling. `useField()` and `useFieldControl()` are exported from `@numior/vue`.
