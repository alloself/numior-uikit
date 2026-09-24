# Tabs

`NuiTabs` follows the WAI-ARIA tabs pattern with the parts `NuiTabList`, `NuiTab` and
`NuiTabPanel`. Arrows switch tabs right away (`activation="manual"` only moves focus), the
list can be horizontal or vertical, the `line` variant underlines the active tab and `soft`
slides a pill behind it. The `tabs` prop builds the list from data and the `panel` slot the
panels.

<script setup>
import { ref } from 'vue'
const tab = ref('general')
const period = ref('week')
const periods = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
]
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiTabs v-model="tab">
    <NuiTabList label="Project settings">
      <NuiTab value="general" icon="info">General</NuiTab>
      <NuiTab value="team">Team</NuiTab>
      <NuiTab value="billing" disabled>Billing</NuiTab>
    </NuiTabList>
    <NuiTabPanel value="general">Name, description and visibility.</NuiTabPanel>
    <NuiTabPanel value="team">Members and their roles.</NuiTabPanel>
    <NuiTabPanel value="billing">Plans and invoices.</NuiTabPanel>
  </NuiTabs>
  <NuiTabs v-model="period" :tabs="periods" variant="soft" size="sm" activation="manual" label="Period">
    <template #panel="{ tab: item }">Statistics for the {{ item.label.toLowerCase() }}.</template>
  </NuiTabs>
</div>

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { NuiTab, NuiTabList, NuiTabPanel, NuiTabs } from '@numior/vue';

const tab = ref('general');
</script>

<template>
  <NuiTabs v-model="tab">
    <NuiTabList label="Project settings">
      <NuiTab value="general" icon="info">General</NuiTab>
      <NuiTab value="team">Team</NuiTab>
      <NuiTab value="billing" disabled>Billing</NuiTab>
    </NuiTabList>
    <NuiTabPanel value="general">…</NuiTabPanel>
    <NuiTabPanel value="team" lazy>…</NuiTabPanel>
    <NuiTabPanel value="billing">…</NuiTabPanel>
  </NuiTabs>
</template>
```

## Behavior

- The active tab is the only tab stop in the list; arrows (ArrowLeft/Right for a horizontal
  list, ArrowUp/Down for a vertical one) loop and skip disabled tabs, Home/End jump to the
  edges. Horizontal arrows mirror in RTL.
- `activation="automatic"` (default) selects a tab when it receives focus; `manual` only
  moves focus and selection happens on Enter, Space or click. When focus leaves the list the
  tab stop returns to the selected tab.
- Panels stay in the DOM and are hidden; `lazy` on a panel or on `NuiTabs` defers rendering
  the content until the first activation and never unmounts it afterwards.
- The indicator is measured from the selected tab and moves at `--nui-duration-slow`; on
  narrow screens a horizontal list scrolls instead of breaking the layout.

Give `v-model` an initial value: without one no tab is selected and every panel is hidden.

## API

`NuiTabs`: `v-model` (`string`), `id`, `activation` (`'automatic' | 'manual'`), `orientation`
(`'horizontal' | 'vertical'`), `variant` (`'line' | 'soft'`), `size` (`NuiSize`), `lazy`, `tabs`
(`{ value, label, icon?, disabled? }[]`), `label` (for a list built from `tabs`). Slots
`default` and `panel="{ tab }"`. `NuiTabList`: `label` (`aria-label`). `NuiTab`: `value`,
`icon`, `disabled`. `NuiTabPanel`: `value`, `lazy`.

Blocks `nui-tabs` (modifiers `--orientation-*`, `--variant-*`, `--size-*`; variables
`--_height`, `--_padding`, `--_font-size`), `nui-tab-list` (modifier `--orientation-*`, element
`__indicator`, variables `--_indicator-start`, `--_indicator-size`, `--_indicator-thickness`),
`nui-tab` (modifiers `--selected`, `--disabled`; elements `__icon`, `__label`), `nui-tab-panel`.
