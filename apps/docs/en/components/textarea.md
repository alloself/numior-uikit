# Textarea

`NuiTextarea` is a native `<textarea>` without a wrapper: attributes, classes and
listeners land directly on it. The value syncs through `v-model` with the `.lazy` and
`.trim` modifiers.

<script setup>
import { ref } from 'vue'
const bio = ref('')
</script>

<div class="nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiField label="About you" description="A few sentences">
    <NuiTextarea v-model="bio" :rows="4" />
  </NuiField>
  <NuiField label="Fixed size">
    <NuiTextarea resize="none" size="sm" placeholder="Compact field" />
  </NuiField>
</div>

```vue
<NuiField label="About you" description="A few sentences">
  <NuiTextarea v-model="bio" :rows="4" />
</NuiField>
```

## API

| Prop       | Type                             | Default      | Description                        |
| ---------- | -------------------------------- | ------------ | ---------------------------------- |
| `v-model`  | `string`                         | `''`         | Value; `.lazy`, `.trim`            |
| `rows`     | `number`                         | `3`          | Visible rows                       |
| `resize`   | `'none' \| 'vertical' \| 'both'` | `'vertical'` | Allowed resizing                   |
| `size`     | `'sm' \| 'md' \| 'lg'`           | `'md'`       | Size step (padding and font)       |
| `id`       | `string`                         | from field   | Explicit id                        |
| `disabled` | `boolean`                        | from field   | Disabled state                     |
| `required` | `boolean`                        | from field   | Required state                     |
| `invalid`  | `boolean`                        | from field   | `aria-invalid` and an error border |
| `readonly` | `boolean`                        | `false`      | Read-only                          |

A `focus()` method is exposed through the template ref. The `nui-textarea--size-sm`,
`nui-textarea--resize-none` and `nui-textarea--invalid` modifiers drive the styles and
are available for your own rules.
