# Drawer

`NuiDrawer` is the same native modal `<dialog>` as the [dialog](/en/components/dialog),
docked to a screen edge. The side is logical: `start` and `end` swap in RTL, `top` and
`bottom` span the full width.

<script setup>
import { ref } from 'vue'
const open = ref(false)
const side = ref('end')
</script>

<div class="vp-raw nui-demo" data-nui-theme="light">
  <NuiButton @click="open = true">Open drawer</NuiButton>
  <label>Side
    <select v-model="side">
      <option value="end">end</option>
      <option value="start">start</option>
      <option value="top">top</option>
      <option value="bottom">bottom</option>
    </select>
  </label>
  <NuiDrawer v-model:open="open" :side="side" title="Filters" description="List settings">
    <NuiField label="Search">
      <NuiInput placeholder="Name" />
    </NuiField>
    <template #footer>
      <NuiButton variant="ghost" tone="neutral" @click="open = false">Reset</NuiButton>
      <NuiButton @click="open = false">Apply</NuiButton>
    </template>
  </NuiDrawer>
</div>

```vue
<NuiDrawer v-model:open="open" side="end" title="Filters">
  <NuiField label="Search">
    <NuiInput />
  </NuiField>
  <template #footer>
    <NuiButton @click="open = false">Apply</NuiButton>
  </template>
</NuiDrawer>
```

The drawer accepts every prop, slot and the `close` event of the dialog. `size` sets the
width for `start`/`end` (16 / 20 / 28rem) and the maximum height for `top`/`bottom`. The
entry slides in from the matching edge through `@starting-style`.

## API

| Prop   | Type                                    | Default | Description |
| ------ | --------------------------------------- | ------- | ----------- |
| `side` | `'start' \| 'end' \| 'top' \| 'bottom'` | `'end'` | Screen edge |

The other props match `NuiDialog`. The root element carries both `nui-dialog` and
`nui-drawer` with the `nui-drawer--side-*` and `nui-drawer--size-*` modifiers;
variables `--_size` and `--_shift`.
