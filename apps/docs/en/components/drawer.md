# Drawer

`NuiDrawer` is a panel that slides in from a screen edge over the page: list filters, a cart,
order details. It behaves like [Dialog](/en/components/dialog): it keeps the focus inside, closes
on Esc and returns the focus to the button.

<Example name="drawer/Filters" />

Build the permanent app menu with [Sidebar](/en/components/sidebar) instead. It stands next to the
content and moves into the same kind of panel on phones.

## Installation

```ts
import { NuiDrawer } from '@numior/vue';
import '@numior/vue/styles/dialog.css';
import '@numior/vue/styles/drawer.css';
```

## Examples

### Sides

The `side` prop picks the edge: `start`, `end` (the default), `top` or `bottom`. In right-to-left
pages `start` and `end` swap, while `top` and `bottom` panels span the full screen width.

<Example name="drawer/Sides" />

`size` sets the width of a side panel or the maximum height of a top or bottom one. The sizes are
`sm` (16rem), `md` (20rem) and `lg` (28rem). The `xl` size (40rem) suits an editor that opens
next to the page.

## Accessibility

The drawer has the same props, slots and `close` event as the dialog. Screen readers announce the
`title` and the `description` on opening, Esc and the close button close the panel, and the focus
returns to the button.

<KeyboardReference name="NuiDialog" />

## API

<ApiReference name="NuiDrawer" />
