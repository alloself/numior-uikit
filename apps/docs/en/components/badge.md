# Badge

`NuiBadge` is a non-interactive label smaller than a chip: a status, a counter or a status
dot. `tone` picks the colour, `variant` the shape (`soft`, `outline`, `solid`) and `size` the
height, 1.25rem or 1rem. `count` with `max` renders a number and "99+", `dot` draws only a dot,
`floating` pins the badge to a corner of its parent. Removable values use the
[chip](/en/components/chip).

<div class="vp-raw nui-demo" data-nui-theme="light">
  <NuiBadge>Draft</NuiBadge>
  <NuiBadge tone="primary" icon="check">Done</NuiBadge>
  <NuiBadge tone="success" variant="outline">Paid</NuiBadge>
  <NuiBadge tone="warning" variant="solid" size="sm">Beta</NuiBadge>
  <NuiBadge tone="error" :count="120" />
  <NuiBadge tone="info" :count="7" :max="5" />
  <NuiBadge tone="success" dot label="Online" />
  <span style="position: relative; display: inline-flex">
    <NuiButton variant="outline" tone="neutral" aria-label="Notifications"><NuiIcon alias="inbox" /></NuiButton>
    <NuiBadge tone="error" :count="3" floating />
  </span>
</div>

```vue
<script setup lang="ts">
import { NuiBadge } from '@numior/vue';
import '@numior/vue/styles/badge.css';
</script>

<template>
  <NuiBadge tone="success" variant="outline">Paid</NuiBadge>
  <NuiBadge tone="error" :count="unread" />
  <NuiBadge tone="success" dot label="Online" />
  <span style="position: relative">
    <NuiButton aria-label="Notifications"><NuiIcon alias="inbox" /></NuiButton>
    <NuiBadge tone="error" :count="unread" floating />
  </span>
</template>
```

## Accessibility

A badge is a `<span>` without a role; its text is read together with its surroundings. A dot
carries no text, so it needs a `label`: the badge then gets `role="img"` and `aria-label`. A
dot without a `label` counts as decorative and is hidden from assistive technology
(`aria-hidden="true"`). A counter over an icon does not replace the accessible name of the
button: name it so the number makes sense in context.

## API

| Prop       | Type                             | Default     | Description                                             |
| ---------- | -------------------------------- | ----------- | ------------------------------------------------------- |
| `tone`     | `NuiTone`                        | `'neutral'` | Colour                                                  |
| `variant`  | `'soft' \| 'outline' \| 'solid'` | `'soft'`    | Shape                                                   |
| `size`     | `'sm' \| 'md'`                   | `'md'`      | Height                                                  |
| `icon`     | `IconAlias`                      | —           | Icon before the text                                    |
| `count`    | `number`                         | —           | Number instead of text; the slot wins                   |
| `max`      | `number`                         | `99`        | Threshold after which `max+` is shown                   |
| `dot`      | `boolean`                        | `false`     | Status dot only                                         |
| `label`    | `string`                         | —           | Accessible name of the dot                              |
| `floating` | `boolean`                        | `false`     | Absolute in the corner of a `position: relative` parent |

The `default` slot replaces `count`. Block `nui-badge`, modifiers `--tone-*`, `--variant-*`,
`--size-*`, `--dot`, `--floating`; elements `__icon`, `__label`; variables `--_tone`,
`--_tone-soft`, `--_height`, `--_padding`, `--_dot-size`, `--_float-x` (flips in RTL).
