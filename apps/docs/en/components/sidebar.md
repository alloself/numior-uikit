# Sidebar

`NuiSidebar` is the navigation side panel of an app inside a [Layout](/en/components/layout). It
holds a header, groups of items with nested lists, and a footer.

A sidebar is always on screen and shares it with the content. For a panel that opens over the
page for a single task, use a [Drawer](/en/components/drawer). On a phone the sidebar turns into
one.

<Example name="sidebar/Basic" />

The `collapsible` prop decides what collapsing does. With `icon` a narrow rail of icons
remains, with `offcanvas` the panel slides off the screen edge, and with `none` it does not
collapse.

## Installation

```ts
import { NuiSidebar, NuiSidebarContent, NuiSidebarGroup, NuiSidebarItem } from '@numior/vue';
import '@numior/vue/styles/list.css';
import '@numior/vue/styles/sidebar.css';
```

## Examples

### Without a background

`variant="plain"` removes the background and the border, and the current item stands out by
colour. The sidebar of this documentation looks like this.

<Example name="sidebar/Plain" />

### On a backdrop

`variant="inset"` puts the panel on a muted background and the page content into a raised card
with rounded corners. Collapsing into the icon rail or off the edge works the same way.

<Example name="sidebar/Inset" />

### Floating

`variant="floating"` shows the panel as a separate card with a border and a shadow, set off from
the screen edges.

<Example name="sidebar/Floating" />

## Behaviour

In the collapsed icon rail an item label shows in a tooltip. A nested list opens as a panel
next to the rail on hover, on click or on an arrow key.

`side="end"` puts the panel on the right, and on the left in right-to-left text. A group with
`collapsible` collapses through a button in its label, and `NuiSidebarSub` through a button in
the item row.

## Accessibility

The panel is an `aside` landmark labelled by `label`, with a `nav` of item lists inside. The
current item carries `aria-current="page"`, and a screen reader calls it the current page.

An item with `href` or `to` becomes a link, the others become buttons. In the icon rail the
labels are hidden from view, but a screen reader still reads them.

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
