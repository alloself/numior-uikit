# Layout

An app screen with a side menu, a top bar and the page content.

<Example name="layout/Basic" />

Put a [Sidebar](/en/components/sidebar) into the `sidebar` slot and a `NuiAppBar` into the
`header` slot. `v-model:open` holds whether the menu is expanded on a wide screen, and
`v-model:mobileOpen` whether it is open on a phone.

## Installation

```ts install
import { NuiAppBar, NuiLayout } from '@numior/kit';
```

## Examples

### Stretch the top bar across the screen

Set `header="full"`.

<Example name="layout/Full" />

Put a table of contents or other side content into the `end` slot. Add `sticky` to keep the menu
and that column in place while the page scrolls.

## Behavior

- The `footer` slot adds a footer: under the menu and the content with `header="full"`, under the
  content only with `header="inset"`.
- On screens up to 48rem wide the menu opens over the page in a
  [Drawer](/en/components/drawer). `NuiSidebarTrigger` opens it, and picking an item closes it.
- `mobileQuery` sets the screen width at which the menu moves into the drawer.
- Ctrl+B, or Cmd+B on a Mac, collapses and expands the menu unless the focus is in a text field.
- A top bar beside the menu starts on the `--spacing-layout-gutter` line of the content. Over a sidebar
  with `collapsible="icon"`, a full top bar centers its button in the icon column and starts the
  rest on the same line. Give your content the same gutter, for example with
  `px-layout-gutter`.

The server renders the layout of a wide screen, and on a phone the menu stays hidden until
scripts load.

## Accessibility

By default the content area is a `<main>` element and the top bar is a `<header>`. The menu
button tells a screen reader whether the menu is open.

The first element on the page is a "Skip to content" link. It shows up only when reached with Tab
and moves the focus past the menu to the content. Change its text in `skipLabel`, or remove it
with `:skip-link="false"` when the page has its own.

<KeyboardReference name="NuiLayout" />

## API

<ApiReference :names="['NuiLayout', 'NuiAppBar', 'NuiSkipLink']" />
