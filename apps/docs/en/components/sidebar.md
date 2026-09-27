# Sidebar

`NuiSidebar` describes the side panel inside [Layout](/en/components/layout): the header, the
scrolling content with groups of items, nested lists and the footer. `collapsible` sets what
collapsing does: an icon rail, off canvas or nothing.

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

## Behaviour

In the icon rail the item labels show up as tooltips, and pressing a sub list expands the
sidebar first. `side` puts the sidebar at the start or the end of the row and follows the
reading direction. A group with `collapsible` collapses through a button in its label,
`NuiSidebarSub` through a button with `aria-expanded`.

## Accessibility

The sidebar is an `aside` with `aria-label`, the content a `nav`, a group a list labelled
through `aria-labelledby`. The current item gets `aria-current="page"`, items with a link render
through `NuiLink`, the rest as buttons. In the icon rail the labels are hidden visually but stay
the accessible name.

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
