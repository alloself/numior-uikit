# Drawer

A panel that slides in from the edge of the screen over the page.

<Example name="drawer/Filters" />

For an app menu that stays on screen, use a [Sidebar](/en/components/sidebar).

## Installation

```ts install
import { NuiDrawer } from '@numior/kit';
```

## Usage

Open the drawer and change its side, size and the ways to close it.

<Configurator name="NuiDrawer" />

## Examples

### Build a form in a drawer

Put the buttons into the `footer` slot.

<Example name="drawer/Form" />

The footer sits outside your `<form>`, so link the submit button to the form with the `form`
attribute.

## Accessibility

The drawer is a [Dialog](/en/components/dialog) at the edge of the screen. The focus, Esc, the
screen reader announcements and the `close` event work the same way.

<KeyboardReference name="NuiDialog" />

## API

<ApiReference name="NuiDrawer" />
