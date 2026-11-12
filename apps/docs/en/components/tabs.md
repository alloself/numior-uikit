# Tabs

`NuiTabs` switches between sections of one screen. The tab list is built from `NuiTabList` and
`NuiTab`, and the content of each tab goes into a `NuiTabPanel`.

<Example name="tabs/Basic" />

The open tab is bound with `v-model`. Arrow keys open the next tab at once; with
`activation="manual"` they only move the focus, and the tab opens on Enter or Space.

## Installation

```ts
import { NuiTab, NuiTabList, NuiTabPanel, NuiTabs } from '@numior/vue';
import '@numior/vue/styles/tabs.css';
```

## Usage

Change the look, size and direction of the tabs on a list of orders.

<Configurator name="NuiTabs" />

## Examples

### Tabs from data

Pass a `tabs` array to build the tabs from data, and render the content with the `panel` slot.
Without the slot `NuiTabs` works as a switcher: the selected tab comes through `v-model`, and
the application decides what to show.

The `soft` variant marks the open tab with a background, the default `line` variant with an
underline.

<Example name="tabs/Data" />

### Vertical tabs

With `orientation="vertical"` the tabs stack in a column and switch with the up and down arrows.

<Example name="tabs/Vertical" />

### Closable tabs

The `closable` prop adds a close button to the tab. The `close` event fires on that button, on
a middle click and on Delete, and the application removes the tab from the list.

Tabs from `tabs` set `closable` in their descriptor. The `close` event then fires on `NuiTabs`
with the value of the tab.

<Example name="tabs/Closable" />

### Link tabs

For moving between pages pass `links` instead of `tabs`. Each item is a link to its `to`
address, and the tabs look the same. Links go through the shared kit helper: `RouterLink`,
`NuxtLink` or the component from `createNuiConfig({ link })`, and a plain `<a>` without a router.

`v-model` holds the key of the current page. A string `to` is its own key, and for an object
location `getKey` sets the key, as in the select. A click without modifier keys updates the model.

<Example name="tabs/Links" />

## Behaviour

Arrow keys wrap around and skip disabled tabs. Without an initial `v-model` value no tab is open.

When the tabs do not fit the width, the list scrolls by a swipe, by the mouse wheel and by
arrow buttons. The buttons appear at the edge that hides tabs. While the list can still scroll
in the direction of the wheel, the page does not scroll.

The selected tab and the focused tab are always brought into view. A vertical list does not
scroll.

Hidden panels stay in the DOM. With `lazy` a panel renders only when it is opened for the first
time.

The underline and the background follow the open tab, even when a label changes or tabs are
added and removed. When the focused tab is closed, the focus moves to the open one. A disabled
tab cannot be closed.

## Accessibility

Only the open tab is in the tab order. The close button is hidden from screen readers, because a
tab list may hold only tabs. On the keyboard Delete closes the tab, as the WAI-ARIA pattern
suggests.

A panel receives focus on Tab, so its text can be reached from the keyboard. When a panel always
holds buttons or links, that stop is not needed: remove it with `:focusable="false"`.

When the tabs come from `tabs` without the `panel` slot, there are no panels, so the tabs get
no `aria-controls`.

Link tabs are marked up as navigation: a `nav` labelled by `label` and links without the `tab`
role. The current page gets `aria-current="page"`. Every link is in the tab order, and arrow keys
do not move between them.

<KeyboardReference name="NuiTabs" />

## API

<ApiReference :names="['NuiTabs', 'NuiTabList', 'NuiTab', 'NuiTabPanel']" />
