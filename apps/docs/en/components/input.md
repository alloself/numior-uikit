# Input

`NuiInput` is a native `<input>` for text-like types inside a wrapper that holds the
border, the focus ring and the `prefix`/`suffix` slots. The value syncs through
`v-model` with the `.lazy` and `.trim` modifiers; IME input and composed characters
behave exactly like a plain `<input v-model>`.

<script setup>
import { ref } from 'vue'
const login = ref('')
const site = ref('')
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiField label="Login">
    <NuiInput v-model.trim="login" placeholder="alex" autocomplete="username">
      <template #prefix>@</template>
    </NuiInput>
  </NuiField>
  <NuiField label="Site" description="Domain without protocol">
    <NuiInput v-model.lazy="site" type="url" size="sm">
      <template #suffix>.com</template>
    </NuiInput>
  </NuiField>
  <NuiField label="Read only">
    <NuiInput model-value="Fixed value" readonly />
  </NuiField>
</div>

```vue
<NuiField label="Login">
  <NuiInput v-model.trim="login" autocomplete="username">
    <template #prefix>@</template>
  </NuiInput>
</NuiField>
```

## Attributes and events

`class` and `style` go to the wrapper; every other attribute (`placeholder`, `name`,
`autocomplete`, `aria-*`, `inputmode`, `maxlength`) and event listener reaches the native
`<input>`. A `focus()` method is exposed through the template ref.

## States

`disabled`, `required` and `invalid` default to the surrounding `NuiField`; an explicit
value on the control overrides the field. `readonly` keeps the text selectable. `size`
(`sm`, `md`, `lg`) picks a step inside the current density.

## API

| Prop       | Type                                                            | Default    | Description                        |
| ---------- | --------------------------------------------------------------- | ---------- | ---------------------------------- |
| `v-model`  | `string`                                                        | `''`       | Value; `.lazy`, `.trim`            |
| `type`     | `'text' \| 'email' \| 'password' \| 'search' \| 'tel' \| 'url'` | `'text'`   | Native input type                  |
| `size`     | `'sm' \| 'md' \| 'lg'`                                          | `'md'`     | Size step                          |
| `id`       | `string`                                                        | from field | Explicit control id                |
| `disabled` | `boolean`                                                       | from field | Disabled state                     |
| `required` | `boolean`                                                       | from field | Required state                     |
| `invalid`  | `boolean`                                                       | from field | `aria-invalid` and an error border |
| `readonly` | `boolean`                                                       | `false`    | Read-only                          |

Slots: `prefix`, `suffix`. Number fields, dates and file upload are separate components
in later waves.
