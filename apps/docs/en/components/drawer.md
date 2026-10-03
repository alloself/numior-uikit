# Drawer

`NuiDrawer` is the same modal `<dialog>` as [Dialog](/en/components/dialog), docked to a screen
edge. The side is logical: `start` and `end` swap in RTL, `top` and `bottom` take the full width.

<Example name="drawer/Filters" />

## Installation

```ts
import { NuiDrawer } from '@numior/vue';
import '@numior/vue/styles/dialog.css';
import '@numior/vue/styles/drawer.css';
```

## Examples

### Sides

`size` sets the width for `start` and `end` and the maximum height for `top` and `bottom`; the
drawer slides in from its edge. Besides the dialog's `sm`, `md` and `lg`, a drawer takes `xl`
(40rem) for an editor that sits beside the page.

<Example name="drawer/Sides" />

## Accessibility

The drawer takes the props, slots and `close` event of the dialog. The title and description are
linked through `aria-labelledby` and `aria-describedby`; Esc and the cross close it, and the
focus returns to the button.

<KeyboardReference name="NuiDialog" />

## API

<ApiReference name="NuiDrawer" />
