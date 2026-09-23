# Popover

`NuiPopover` builds on the Popover API: the content carries `popover="auto"` and the
trigger `popovertarget`. The browser opens the layer in the top layer, closes it on Esc
and on outside clicks (light dismiss) and places the content right after the trigger in
the Tab order. The position comes from `useFloating` (flip, shift, arrow) and updates on
scroll and resize.

<script setup>
import { ref } from 'vue'
const open = ref(false)
</script>

<div class="nui-demo" data-nui-theme="light">
  <NuiPopover v-model:open="open" placement="bottom-start" arrow>
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="outline">Filters</NuiButton>
    </template>
    <NuiField label="Author">
      <NuiInput placeholder="Name" />
    </NuiField>
  </NuiPopover>
  <span>Open: {{ open }}</span>
</div>

```vue
<NuiPopover v-model:open="open" placement="bottom-start" arrow>
  <template #trigger="{ attrs }">
    <NuiButton v-bind="attrs" variant="outline">Filters</NuiButton>
  </template>
  <NuiField label="Author">
    <NuiInput />
  </NuiField>
</NuiPopover>
```

## Trigger

The `trigger` slot exposes `attrs`: an object with `popovertarget`, `aria-expanded`,
`aria-controls` and a function ref. Bind it with `v-bind` to any button, native or
`NuiButton`. A click opens the layer without JavaScript while `v-model:open` stays the
source of truth for programmatic control. The slot also receives `open`.

## Top layer and theme

The content stays in the DOM next to the trigger, so it inherits the theme, density and
`dir` of its scope and does not depend on ancestor `overflow` or `z-index`. It is
positioned with `position: fixed` against the viewport. The entry animates through
`@starting-style`; under `prefers-reduced-motion` it is instant.

## API

| Prop           | Type                | Default    | Description                                        |
| -------------- | ------------------- | ---------- | -------------------------------------------------- |
| `v-model:open` | `boolean`           | `false`    | Whether the layer is open                          |
| `id`           | `string`            | generated  | Content id and `popovertarget` target              |
| `placement`    | `FloatingPlacement` | `'bottom'` | `top`/`bottom`/`left`/`right` with `-start`/`-end` |
| `offset`       | `number`            | `8`        | Distance from the trigger in px                    |
| `arrow`        | `boolean`           | `false`    | Arrow pointing at the trigger                      |

Slots: `trigger="{ attrs, open }"`, `default`. Attributes and classes land on the content.
Block `nui-popover`, modifiers `nui-popover--side-*` by the resolved side after flipping,
element `__arrow`, variables `--_shift`, `--_arrow`. `usePopover` and `useFloating` are
exported for custom layers.
