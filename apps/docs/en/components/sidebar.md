# Sidebar

`NuiSidebar` describes the side panel inside [Layout](/en/components/layout): the header, the
scrolling content with groups of items, nested lists and the footer. `collapsible` sets what
collapsing does: an icon rail, off canvas or nothing.

A sidebar is permanent navigation that shares the screen with the content. A temporary panel
over the page for one task is a [Drawer](/en/components/drawer); the sidebar turns into one on a
narrow screen.

<Example name="sidebar/Basic" />

## Installation

```ts
import { NuiSidebar, NuiSidebarContent, NuiSidebarGroup, NuiSidebarItem } from '@numior/vue';
import '@numior/vue/styles/list.css';
import '@numior/vue/styles/sidebar.css';
```

## Examples

### Without a background

`variant="plain"` removes the background and the border, the current item stands out by colour;
the sidebar of this documentation is built this way.

<Example name="sidebar/Plain" />

### On a backdrop

`variant="inset"` puts the sidebar on a muted background and the layout content into a raised
card with rounded corners. The icon rail and off canvas work as usual.

<Example name="sidebar/Inset" />

### Floating

`variant="floating"` draws the sidebar as a card with a border and a shadow, set off from the
frame edges.

<Example name="sidebar/Floating" />

## Behaviour

In the icon rail the item labels show up as tooltips. A sub list opens as a flyout next to the
rail: on hover, click or an arrow key.

`side` puts the sidebar at the start or the end of the row and follows the reading direction. A
group with `collapsible` collapses through a button in its label, `NuiSidebarSub` through a
button with `aria-expanded`.

## Accessibility

The sidebar is an `aside` with `aria-label`, the content a `nav`, a group a list labelled
through `aria-labelledby`. The current item gets `aria-current="page"`, items with a link render
through `NuiLink`, the rest as buttons. In the icon rail the labels are hidden visually but stay
the accessible name.

<KeyboardReference name="NuiSidebarSub" />

## API

<ApiReference
  :names="[
    'NuiSidebar',
    'NuiSidebarHeader',
    'NuiSidebarContent',
    'NuiSidebarFooter',
    'NuiSidebarGroup',
    'NuiSidebarItem',
    'NuiSidebarSub',
    'NuiSidebarTrigger',
  ]"
/>
