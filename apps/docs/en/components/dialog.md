# Dialog

`NuiDialog` is a modal window over the page for a confirmation, a short form or a message that
must not be missed. While it is open, the focus stays inside and the page underneath is
unavailable.

<Example name="dialog/Confirm" />

Buttons in a `method="dialog"` form close the window without handlers. The `close` event
receives the `value` of the pressed button: `cancel` or `confirm` in the example. The window stays
in the markup where you wrote it, so it takes the theme and the reading direction of its parent.

## Installation

```ts
import { NuiDialog } from '@numior/vue';
import '@numior/vue/styles/dialog.css';
```

## Usage

Open the dialog and change its size, placement and the ways to close it.

<Configurator name="NuiDialog" />

## Examples

### A required dialog

With `:closable="false"` the window has no close button, and neither Esc nor a click on the
backdrop closes it. Only your own button, such as "I confirm", can close it.

<Example name="dialog/Required" />

### Several levels

A dialog opened from another dialog appears on top of it, with a single backdrop under the top
window. Esc closes only the top dialog and returns the focus to the button that opened it.

<Example name="dialog/Stacked" />

### At the top edge

`placement="top"` puts the window at the top edge of the screen. A form window then stays in
place when fields appear or disappear.

<Example name="dialog/Placement" />

### Long content

Long text scrolls inside the window, while the title and the buttons at the bottom stay in place.

<Example name="dialog/Long" />

## Accessibility

Screen readers announce the `title` and the `description` when the window opens. The focus goes to
the first interactive element in the body, and the close button comes last in the tab order. Esc
closes the window and returns the focus to the button that opened it.

While the window is open, the page underneath neither scrolls nor shifts sideways.

<KeyboardReference name="NuiDialog" />

## API

<ApiReference name="NuiDialog" />
