# Alert

`NuiAlert` is a static in-page message: `variant` picks the shape (`soft`, `outline`,
`solid`) and `tone` the role and the icon from the registry. `tone="error"` gets
`role="alert"`; the other tones read as regular text.

<script setup>
import { ref } from 'vue'
const open = ref(true)
</script>

<div class="nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiAlert title="Draft saved" description="Server sync in a minute." />
  <NuiAlert tone="success" variant="outline" title="Project published" />
  <NuiAlert tone="warning" title="Draft not saved" dismissible dismiss-label="Close" v-model:open="open">
    Changes are lost when you leave the page.
    <template #actions><NuiButton size="sm" variant="soft" tone="warning" @click="open = false">Save</NuiButton></template>
  </NuiAlert>
  <NuiButton v-if="!open" size="sm" variant="ghost" tone="neutral" @click="open = true">Show again</NuiButton>
  <NuiAlert tone="error" variant="solid" title="Could not connect" description="Check the network and retry." />
</div>

```vue
<NuiAlert tone="warning" title="Draft not saved" dismissible v-model:open="open">
  Changes are lost when you leave the page.
  <template #actions>
    <NuiButton size="sm" variant="soft" tone="warning">Save</NuiButton>
  </template>
</NuiAlert>
```

`dismissible` adds a close button that sets `v-model:open` to `false` and emits
`dismiss`. A closed alert hides with a transition and stays in the DOM; remove it with
`v-if` when needed.

## API

| Prop           | Type                             | Default   | Description                         |
| -------------- | -------------------------------- | --------- | ----------------------------------- |
| `variant`      | `'soft' \| 'outline' \| 'solid'` | `'soft'`  | Shape                               |
| `tone`         | `NuiTone`                        | `'info'`  | Role, colors and icon               |
| `title`        | `string`                         | —         | Heading; `title` slot               |
| `description`  | `string`                         | —         | Text; default slot                  |
| `icon`         | `IconAlias`                      | tone icon | Custom icon                         |
| `hideIcon`     | `boolean`                        | `false`   | No icon                             |
| `dismissible`  | `boolean`                        | `false`   | Close button                        |
| `dismissLabel` | `string`                         | `'Close'` | Accessible name of the close button |
| `v-model:open` | `boolean`                        | `true`    | Whether the alert is shown          |

Event `dismiss`. Slots `title`, `default`, `actions`. Block `nui-alert`, modifiers
`--variant-*`, `--tone-*`, `--closed`; elements `__icon`, `__body`, `__title`,
`__description`, `__actions`, `__close`.
