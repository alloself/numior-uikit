# Field

`NuiField` connects a control with its label, description and error. The field creates
a shared `id`, and the control inside receives `id`, `aria-describedby`, `aria-invalid`,
`required` and `disabled` through provide/inject. Controls also work without
`NuiField`; explicit control props always override the field context.

<script setup>
import { ref } from 'vue'
const email = ref('')
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
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

## Room for the error

`reserve-error` keeps an empty line under the control, one error line high. The error takes
it, so neighbouring fields and buttons stay put when messages appear after a submit; an error
longer than a line still adds height. In forms `NuiForm` and `NuiSmartForm` take the prop and
it reaches every field inside.

```vue
<NuiField label="Email" :error="error" reserve-error>
  <NuiInput v-model="email" type="email" />
</NuiField>
```

## Slots and parts

Pass the label, description and error through the `label`, `description` and `error`
slots when you need richer markup than text. The `NuiFieldLabel`, `NuiFieldDescription`
and `NuiFieldError` parts are exported for your own wrappers built on `provideField`
from `@numior/primitives`; inside `NuiField` prefer props and named slots so that
`aria-describedby` is known during server rendering.

## API

| Prop           | Type      | Default   | Description                                           |
| -------------- | --------- | --------- | ----------------------------------------------------- |
| `id`           | `string`  | generated | Control id; the other ids derive from it              |
| `label`        | `string`  | —         | Label text; the `label` slot is the alternative       |
| `description`  | `string`  | —         | Description below the control; `description` slot     |
| `error`        | `string`  | —         | Error text; makes the field and control `invalid`     |
| `invalid`      | `boolean` | `false`   | Mark the field invalid without an error text          |
| `required`     | `boolean` | `false`   | Required marker and the `required` attribute          |
| `disabled`     | `boolean` | `false`   | Disables the control; for a group, the whole fieldset |
| `group`        | `boolean` | `false`   | `fieldset` + `legend` instead of `label`              |
| `reserveError` | `boolean` | `false`   | Keeps a line for the error even while there is none   |

State is reflected by the `nui-field--invalid`, `nui-field--required`,
`nui-field--disabled`, `nui-field--group` and `nui-field--reserve-error` modifiers (the
empty line is the `nui-field__reserve` element). `useFieldContext()` and
`useFieldControl()` are exported from `@numior/vue`.
