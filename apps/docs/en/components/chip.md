# Chip

`NuiChip` is a compact label on the role tokens: `tone` picks the colour, `variant` the shape
(`soft`, `outline`, `solid`) and `size` the height, 1.5rem or 1.25rem. `removable` adds a
remove button with an accessible name from `removeLabel` and a `remove` event. The same chip
shows selected values in `NuiCombobox`.

<div class="vp-raw nui-demo" data-nui-theme="light">
  <NuiChip>Neutral</NuiChip>
  <NuiChip tone="primary" icon="check">With icon</NuiChip>
  <NuiChip tone="success" variant="outline">Outline</NuiChip>
  <NuiChip tone="warning" variant="solid">Solid</NuiChip>
  <NuiChip removable remove-label="Remove Vue">Vue</NuiChip>
  <NuiChip size="sm" tone="info" removable remove-label="Remove Vite">Vite</NuiChip>
</div>

```vue
<script setup lang="ts">
import { NuiChip } from '@numior/vue';
import '@numior/vue/styles/chip.css';
</script>

<template>
  <NuiChip tone="success" variant="outline">Paid</NuiChip>
  <NuiChip removable remove-label="Remove the Vue filter" @remove="clear">Vue</NuiChip>
</template>
```

## Accessibility

A chip is a `<span>` and is not interactive by itself. The remove button is a regular
`<button>` named by `removeLabel`; it is out of the Tab order (`tabindex="-1"`) because in a
chip list removal is reachable from the field (Backspace in the combobox). For a standalone
chip, offer removal somewhere reachable too, or pass a `remove-label` that names the item.

## API

| Prop          | Type                             | Default     | Description                   |
| ------------- | -------------------------------- | ----------- | ----------------------------- |
| `tone`        | `NuiTone`                        | `'neutral'` | Colour                        |
| `variant`     | `'soft' \| 'outline' \| 'solid'` | `'soft'`    | Shape                         |
| `size`        | `'sm' \| 'md'`                   | `'md'`      | Height                        |
| `icon`        | `IconAlias`                      | —           | Icon before the text          |
| `removable`   | `boolean`                        | `false`     | Remove button                 |
| `removeLabel` | `string`                         | `'Remove'`  | Accessible name of the button |
| `disabled`    | `boolean`                        | `false`     | Muted look, removal disabled  |

Event `remove`. Block `nui-chip`, modifiers `--tone-*`, `--variant-*`, `--size-*`,
`--removable`, `--disabled`; elements `__icon`, `__label`, `__remove`; variables `--_tone`,
`--_tone-soft`, `--_height`, `--_padding`.
