# Layout

`NuiLayout` lays out an app screen: a side menu on the left, a top bar `NuiAppBar` and the area
with the page content. Build the menu from [Sidebar](/en/components/sidebar) and put it into the
`sidebar` slot.

<Example name="layout/Basic" />

`v-model:open` holds whether the menu is expanded on a wide screen, and `v-model:mobileOpen`
whether it is open on a phone.

## Installation

```ts
import { NuiAppBar, NuiLayout } from '@numior/vue';
import '@numior/vue/styles/layout.css';
import '@numior/vue/styles/skip-link.css';
```

## Examples

### Full-width bar and a right column

With `header="full"` the top bar spans the full width above the side menu. The `end` slot adds a
column on the right, for example for a table of contents. With `sticky` the menu and the columns
stay in place while the page scrolls, and each scrolls on its own.

<Example name="layout/Full" />

## Behaviour

The `footer` slot renders a footer. With `header="full"` it spans the full width under the menu and
the content, and with `header="inset"` it sits under the content.

On screens up to 48rem wide the menu moves into a sliding [Drawer](/en/components/drawer). The
`NuiSidebarTrigger` button opens it, and picking an item closes it. `mobileQuery` sets the width
at which this happens.

Until scripts load, the screen counts as wide, so the server-rendered page looks the same as the
first frame in the browser. Ctrl+B, or Cmd+B on a Mac, collapses and expands the menu unless the
focus is in a text field.

## Accessibility

The content area renders as `<main>` and the top bar as `<header>`. The menu button tells screen
readers whether the menu is open.

The first element on the page is a "Skip to content" link. It appears only when reached with Tab
and moves the focus straight to the content past the menu. `skipLabel` changes its text, and
`:skip-link="false"` removes it when the page already has its own.

<KeyboardReference name="NuiLayout" />

## API

<ApiReference :names="['NuiLayout', 'NuiAppBar', 'NuiSkipLink']" />
