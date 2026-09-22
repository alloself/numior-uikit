# Switch

`NuiSwitch` is a native checkbox with `role="switch"` under an animated track. The model
is a `boolean`. Space toggles it, screen readers announce on/off, and the thumb position
uses logical properties, so it moves the right way in RTL.

<script setup>
import { ref } from 'vue'
const notifications = ref(true)
const compact = ref(false)
</script>

<div class="nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiSwitch v-model="notifications">Notifications: {{ notifications ? 'on' : 'off' }}</NuiSwitch>
  <NuiSwitch v-model="compact" size="sm">Compact mode</NuiSwitch>
  <NuiSwitch size="lg" disabled>Unavailable</NuiSwitch>
</div>

```vue
<NuiSwitch v-model="notifications">Notifications</NuiSwitch>
```

## API

| Prop       | Type                   | Default    | Description                       |
| ---------- | ---------------------- | ---------- | --------------------------------- |
| `v-model`  | `boolean`              | `false`    | State                             |
| `size`     | `'sm' \| 'md' \| 'lg'` | `'md'`     | Track and text size               |
| `id`       | `string`               | from field | Explicit control id               |
| `disabled` | `boolean`              | from field | Disabled state                    |
| `required` | `boolean`              | from field | Required state                    |
| `invalid`  | `boolean`              | from field | `aria-invalid` and an error track |

The default slot is the label. `class` and `style` go to the `<label>`; other attributes
and listeners reach the `<input>`. Modifiers: `nui-switch--checked`,
`nui-switch--disabled`, `nui-switch--invalid`, `nui-switch--size-sm`.
