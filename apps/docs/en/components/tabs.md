# Tabs

`NuiTabs` follows the WAI-ARIA tabs pattern with the `NuiTabList`, `NuiTab` and `NuiTabPanel`
parts. Arrow keys switch tabs at once, `activation="manual"` only moves the focus; the `line`
variant underlines the active tab, `soft` moves a pill.

<Example name="tabs/Basic" />

## Installation

```ts
import { NuiTab, NuiTabList, NuiTabPanel, NuiTabs } from '@numior/vue';
import '@numior/vue/styles/tabs.css';
```

## Examples

### Tabs from data

`tabs` builds the list from data, the `panel` slot renders the panel of each tab.

<Example name="tabs/Data" />

### A vertical list

`orientation="vertical"` stacks the list; the up and down arrows move through the tabs.

<Example name="tabs/Vertical" />

## Behaviour

The active tab is the only tab stop in the list; arrow keys wrap around and skip disabled tabs.
Panels stay in the DOM and hide, `lazy` defers rendering until the first show. Without an
initial `v-model` no tab is selected.

<KeyboardReference name="NuiTabs" />

## API

<ApiReference :names="['NuiTabs', 'NuiTabList', 'NuiTab', 'NuiTabPanel']" />
