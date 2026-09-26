# Tooltip

`NuiTooltip` is a popover with `role="tooltip"` and `popover="manual"`, linked to its
trigger through `aria-describedby`. It appears on hover after a delay and immediately on
keyboard focus, hides when the pointer leaves, on blur and on Esc. The pointer can move
onto the tooltip without closing it; a tap on touch devices does not show it.

<script setup>
import { ref } from 'vue'
const open = ref(false)
</script>

<div class="vp-raw nui-demo" data-nui-theme="light">
  <NuiTooltip v-model:open="open">
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="ghost" tone="neutral">Save</NuiButton>
    </template>
    Saves the document and its history
  </NuiTooltip>
  <NuiTooltip placement="right" :open-delay="0">
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="outline" aria-label="Delete"><NuiIcon alias="x" /></NuiButton>
    </template>
    Delete without confirmation
  </NuiTooltip>
</div>

```vue
<NuiTooltip>
  <template #trigger="{ attrs }">
    <NuiButton v-bind="attrs" variant="ghost" tone="neutral">Save</NuiButton>
  </template>
  Saves the document and its history
</NuiTooltip>
```

## Accessibility

The tooltip describes the trigger instead of naming it: a button without text still needs
an `aria-label`. The behavior follows WCAG 1.4.13: dismissible with Esc, hoverable,
persistent. Whatever the tooltip says must be available without it, because touch screens
never show it.

## API

| Prop           | Type                  | Default   | Description                                   |
| -------------- | --------------------- | --------- | --------------------------------------------- |
| `v-model:open` | `boolean`             | `false`   | Whether the tooltip is shown                  |
| `id`           | `string`              | generated | Tooltip id and `aria-describedby` value       |
| `placement`    | `FloatingPlacement`   | `'top'`   | Side and alignment                            |
| `offset`       | `number`              | `6`       | Distance from the trigger in px               |
| `openDelay`    | `number`              | `300`     | Hover delay before showing, ms                |
| `closeDelay`   | `number`              | `100`     | Delay before hiding after leaving, ms         |
| `disabled`     | `boolean`             | `false`   | Never show and don't describe the trigger     |
| `anchor`       | `HTMLElement \| null` | —         | External anchor instead of the `trigger` slot |

Slots: `trigger="{ attrs, open }"`, `default`. `attrs` carries `aria-describedby`, a
function ref and the pointer/focus/keyboard handlers. With `anchor` the `trigger` slot is not
needed: the tooltip sits next to the given element and listens to its hover, focus and
Escape itself, but sets no `aria-describedby` — it is a visual hint, and the owner gives the
element its name and description (this is how the sidebar labels icons when collapsed).
Block `nui-tooltip`, element `__arrow`; `useFloating` writes the side into
`--_side-x`/`--_side-y`, colors come from `--nui-neutral`.
