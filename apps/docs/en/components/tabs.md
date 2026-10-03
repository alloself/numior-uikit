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

### Closable tabs

`closable` draws a cross on the tab. The `close` event comes from the cross, the middle mouse
button and Delete; the application removes the tab. A tab from `tabs` takes `closable` from its
descriptor, and `close` arrives on `NuiTabs` with the value of the tab.

<Example name="tabs/Closable" />

## Behaviour

The active tab is the only tab stop in the list; arrow keys wrap around and skip disabled tabs.
Panels stay in the DOM and hide, `lazy` defers rendering until the first show. Without an
initial `v-model` no tab is selected.

The indicator follows the tabs: a label may change, tabs may come and go. The focus of a closed
tab moves to the selected one. A disabled tab does not close.

## Accessibility

The cross is hidden from screen readers: a tab list may hold only tabs. On the keyboard Delete
closes the tab, as the WAI-ARIA pattern advises.

A panel is a Tab stop, so that its text can be reached from the keyboard. When a panel always holds
its own buttons and links, the WAI-ARIA pattern does not ask for that stop, and `:focusable="false"`
removes it. A click on an empty spot of such a panel then no longer rings it with focus.

<KeyboardReference name="NuiTabs" />

## API

<ApiReference :names="['NuiTabs', 'NuiTabList', 'NuiTab', 'NuiTabPanel']" />
