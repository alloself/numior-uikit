# Sidebar

The side menu of an app.

It stays beside the content in a [Layout](/en/components/layout), while a
[Drawer](/en/components/drawer) opens over the page.

<Example name="sidebar/Basic" />

Choose what collapsing does in `collapsible`:

- `offcanvas`, the default, slides the panel off the screen edge.
- `icon` leaves a narrow rail of icons.
- `none` keeps the panel open.

## Installation

```ts install
import { NuiSidebar, NuiSidebarContent, NuiSidebarGroup, NuiSidebarItem } from '@numior/kit';
```

## Examples

### Remove the background

Set `variant="plain"`.

<Example name="sidebar/Plain" />

The side menu of this documentation is a plain sidebar.

### Put the page on a backdrop

Set `variant="inset"`.

<Example name="sidebar/Inset" />

### Show the sidebar as a separate card

Set `variant="floating"`.

<Example name="sidebar/Floating" />

## Behavior

- In the icon rail, an item label shows in a tooltip.
- A nested list opens next to the rail on hover. A click pins it, and Escape closes it.
- `NuiSidebarSub` with `active` is expanded from the first frame, on the server too.
- `side="end"` puts the panel on the right, and on the left in right-to-left text.
- A group with `collapsible` gets a button in its heading that collapses the group.

## Accessibility

The panel is an `aside` landmark named by `label`, with a `nav` of item lists inside. A screen
reader announces the current item as the current page.

An item with `href` or `to` becomes a link, and the others become buttons. In the icon rail the
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
