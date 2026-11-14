# Tabs

Tabs for the sections of one screen.

<Example name="tabs/Basic" />

Bind the open tab with `v-model`: it holds the `value` of that tab.

## Installation

```ts
import { NuiTab, NuiTabList, NuiTabPanel, NuiTabs } from '@numior/vue';
import '@numior/vue/styles/tabs.css';
```

## Usage

Change the look, size and orientation of the tabs and the way arrow keys open them.

<Configurator name="NuiTabs" />

## Examples

### Build tabs from data

Pass a `tabs` array and render the panels in the `panel` slot.

<Example name="tabs/Data" />

Without the slot the tabs only switch: `v-model` gets the chosen tab, and your app decides what
to show.

### Close tabs

Add `closable` and remove the tab from your list in the `close` handler.

<Example name="tabs/Closable" />

A tab closes with its button, a middle click or Delete. Tabs from `tabs` take `closable` in their
descriptor, and `NuiTabs` then fires `close` with the `value` of the tab.

### Link tabs to routes

Pass `links`.

<Example name="tabs/Links" />

Each tab becomes a link to its `to` and renders like a [Link](/en/components/link) with `to`.
`v-model` holds the key of the current page: a string `to` is its own key, and `getKey` builds
one from a route object. A click without modifier keys updates the model.

## Behavior

Arrow keys wrap around and skip disabled tabs. Without a `v-model` value no tab is open.

When the tabs do not fit, the list scrolls with a swipe, the mouse wheel and the arrow buttons at
its edges. A button shows up only at the edge that hides tabs. While the list can still scroll in
the direction of the wheel, the page does not scroll.

The open tab and the focused tab always scroll into view. A vertical list does not scroll.

Hidden panels stay in the markup. With `lazy`, a panel renders the first time its tab opens.

The underline and the background follow the open tab when a label changes or tabs come and go.
When the focused tab closes, the focus moves to the open one. A disabled tab cannot be closed.

## Accessibility

Only the open tab is in the Tab order. Arrow keys open the next tab at once; with
`activation="manual"` they only move the focus, and Enter or Space opens the tab.

A screen reader does not see the close button, because a tab list may hold only tabs. Delete
closes the focused tab, as the WAI-ARIA pattern suggests.

A panel takes the focus on Tab, so the user reaches its text from the keyboard. When a panel
always starts with a button or a link, remove that stop with `:focusable="false"`.

Tabs from `tabs` without the `panel` slot have no panels, so they get no `aria-controls`.

Link tabs are a `nav` labeled by `label`, with plain links in place of tabs. The current page
gets `aria-current="page"`. Every link is in the Tab order, and arrow keys do not move between
them.

<KeyboardReference name="NuiTabs" />

## API

<ApiReference :names="['NuiTabs', 'NuiTabList', 'NuiTab', 'NuiTabPanel']" />
